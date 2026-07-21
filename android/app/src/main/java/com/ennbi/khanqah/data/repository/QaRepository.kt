package com.khanqah.app.data.repository

import android.util.Base64
import com.khanqah.app.crypto.EncryptedEnvelope
import com.khanqah.app.crypto.IdentityKeyStore
import com.khanqah.app.crypto.QaCrypto
import com.khanqah.app.crypto.QaProtocol
import com.khanqah.app.crypto.QuestionEnvelope
import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.api.ShaykhKeyStore
import com.khanqah.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class ShaykhKeyChangedException : Exception("Shaykh key changed — refusing to send")

/** Decrypted view of a thread message for the UI (built in 2E). */
data class DecryptedMessage(
    val id: String,
    val direction: String,       // "q" | "a"
    val createdAt: String,
    val text: String,            // empty for our own questions (see note); shown from local cache in 2E
    val audioRef: String?,
    val audioKeyB64: String?,
    val audioNonceB64: String?,
    val readAt: String?,
    val replyTo: String? = null, // answers: id of the question this answers
    val durationSec: Int = 0,    // answers: voice-note length (from the encrypted envelope)
)

class QaRepository(
    private val api: ApiService,
    private val identity: IdentityKeyStore,
    private val crypto: QaCrypto,
    private val keyStore: ShaykhKeyStore,
) {
    private fun b64e(b: ByteArray) = Base64.encodeToString(b, Base64.NO_WRAP)
    private fun b64d(s: String) = Base64.decode(s, Base64.NO_WRAP)

    suspend fun ensureRegistered() {
        if (keyStore.myKeyId() != null) return
        val pub = identity.ensureKeypair()
        val resp = api.registerKey(RegisterKeyRequest(publicKey = b64e(pub)))
        keyStore.setMyKeyId(resp.id)
    }

    suspend fun shaykhPublicKey(): ByteArray {
        val resp = api.getShaykhKey()
        val pinned = keyStore.pinnedShaykhKey()
        if (pinned == null) keyStore.setPinnedShaykhKey(resp.publicKey)
        else if (pinned != resp.publicKey) throw ShaykhKeyChangedException()
        return b64d(resp.publicKey)
    }

    private suspend fun sendEnvelope(env: QuestionEnvelope, threadId: String?): SendMessageResponse {
        ensureRegistered()
        val shaykhPub = shaykhPublicKey()
        val plaintext = QaProtocol.encodeQuestion(env)
        val e: EncryptedEnvelope = crypto.encryptForRecipient(plaintext, shaykhPub)
        return api.sendQaMessage(
            SendMessageRequest(
                threadId = threadId,
                direction = "q",
                contentType = "text",
                ciphertextInline = e.b64(e.ciphertext),
                encCek = e.b64(e.encCek),
                nonceKey = e.b64(e.nonceKey),
                noncePayload = e.b64(e.noncePayload),
                senderKeyId = keyStore.myKeyId()!!,
                byteSize = plaintext.size.toLong(),
            )
        )
    }

    suspend fun sendTextQuestion(name: String, phone: String, address: String, urduText: String, threadId: String? = null) =
        sendEnvelope(QuestionEnvelope(name, phone, address, kind = "text", text = urduText), threadId)

    suspend fun sendAudioQuestion(
        name: String, phone: String, address: String, urduTranscript: String,
        audioBytes: ByteArray, threadId: String? = null,
    ): SendMessageResponse = withContext(Dispatchers.IO) {
        ensureRegistered()
        val rng = SecureRandom()
        val audioKey = ByteArray(32).also { rng.nextBytes(it) }
        val audioNonce = ByteArray(12).also { rng.nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(audioKey, "AES"), GCMParameterSpec(128, audioNonce))
        val encAudio = cipher.doFinal(audioBytes)

        val up = api.qaUploadUrl(QaUploadRequest(threadId = threadId ?: ""))
        val client = OkHttpClient()
        val putResp = client.newCall(
            Request.Builder().url(up.uploadUrl)
                .put(encAudio.toRequestBody("application/octet-stream".toMediaType()))
                .header("Content-Type", "application/octet-stream")
                .build()
        ).execute()
        if (!putResp.isSuccessful) throw Exception("audio upload failed: ${putResp.code}")

        sendEnvelope(
            QuestionEnvelope(
                name, phone, address, kind = "audio", text = urduTranscript,
                audioRef = up.fileKey, audioKeyB64 = b64e(audioKey), audioNonceB64 = b64e(audioNonce),
            ),
            threadId,
        )
    }

    suspend fun listThreads(): List<QaThreadDto> = api.listQaThreads()

    /**
     * Decrypt a thread's messages for display. NOTE: crypto_box is authenticated —
     * we cannot open a box we sealed to the Shaykh (needs the Shaykh's secret key),
     * so our OWN questions (direction == "q") are NOT decryptable from the server copy.
     * Those return empty text here; 2E renders them from a local Room cache written at
     * send time. Only the Shaykh's answers (direction == "a") are decrypted, against the
     * pinned Shaykh public key.
     */
    suspend fun threadMessages(threadId: String): List<DecryptedMessage> {
        val shaykhPub = shaykhPublicKey()
        return api.listQaMessages(threadId).map { m ->
            if (m.direction == "a" && m.ciphertextInline != null) {
                val env = EncryptedEnvelope(
                    encCek = b64d(m.encCek), nonceKey = b64d(m.nonceKey),
                    noncePayload = b64d(m.noncePayload), ciphertext = b64d(m.ciphertextInline),
                )
                val a = QaProtocol.decodeAnswer(crypto.decryptFromSender(env, shaykhPub))
                DecryptedMessage(m.id, m.direction, m.createdAt, a.text, a.audioRef, a.audioKeyB64, a.audioNonceB64, m.readAt, m.replyTo, a.durationSec)
            } else {
                // Our own question: text comes from local cache in 2E (TODO 2E).
                DecryptedMessage(m.id, m.direction, m.createdAt, "", null, null, null, m.readAt, m.replyTo)
            }
        }
    }

    suspend fun fetchAudio(audioRef: String, audioKeyB64: String, audioNonceB64: String): ByteArray =
        withContext(Dispatchers.IO) {
            val dl = api.qaDownloadUrl(QaDownloadRequest(fileKey = audioRef))
            val client = OkHttpClient()
            val resp = client.newCall(Request.Builder().url(dl.downloadUrl).get().build()).execute()
            if (!resp.isSuccessful) throw Exception("audio download failed: ${resp.code}")
            val enc = resp.body?.bytes() ?: throw Exception("empty audio")
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(b64d(audioKeyB64), "AES"), GCMParameterSpec(128, b64d(audioNonceB64)))
            cipher.doFinal(enc)
        }

    suspend fun markRead(messageId: String) { api.markQaRead(messageId) }
}
