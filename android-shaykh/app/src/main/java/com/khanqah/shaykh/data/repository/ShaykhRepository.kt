package com.khanqah.shaykh.data.repository

import android.util.Base64
import com.khanqah.shaykh.crypto.AnswerEnvelope
import com.khanqah.shaykh.crypto.EncryptedEnvelope
import com.khanqah.shaykh.crypto.IdentityKeyStore
import com.khanqah.shaykh.crypto.QaCrypto
import com.khanqah.shaykh.crypto.QaProtocol
import com.khanqah.shaykh.crypto.QuestionEnvelope
import com.khanqah.shaykh.data.api.ApiService
import com.khanqah.shaykh.data.model.*
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

data class IncomingQuestion(
    val threadId: String,
    val messageId: String,
    val questionerUserId: String,
    val name: String,
    val phone: String,
    val address: String,
    val text: String,
    val audioRef: String?,
    val audioKeyB64: String?,
    val audioNonceB64: String?,
    val createdAt: String,
)

class ShaykhRepository(
    private val api: ApiService,
    private val identity: IdentityKeyStore,
    private val crypto: QaCrypto,
) {
    private fun b64e(b: ByteArray) = Base64.encodeToString(b, Base64.NO_WRAP)
    private fun b64d(s: String) = Base64.decode(s, Base64.NO_WRAP)

    private var myKeyId: String? = null

    suspend fun ensureRegistered() {
        if (myKeyId != null) return
        val pub = identity.ensureKeypair()
        myKeyId = api.registerKey(RegisterKeyRequest(publicKey = b64e(pub))).id
    }

    private suspend fun questionerKey(userId: String): ByteArray =
        b64d(api.getUserKey(userId).publicKey)

    suspend fun pendingThreads(): List<QaThreadDto> =
        api.listQaThreads().filter { it.status != "answered" }

    suspend fun allThreads(): List<QaThreadDto> = api.listQaThreads()

    /** All UNANSWERED questions in a thread, oldest first — so multiple voice notes (or
     *  follow-ups) in one thread are each surfaced and none is lost. A question counts as
     *  answered only when an answer points back at it via reply_to, so answering the latest
     *  follow-up no longer hides the earlier ones. */
    suspend fun openThreadQuestions(thread: QaThreadDto): List<IncomingQuestion> {
        ensureRegistered()
        val questionerPub = questionerKey(thread.userId)
        val msgs = api.listQaMessages(thread.id) // server returns created_at ASC
        val answeredQuestionIds = msgs
            .filter { it.direction == "a" && it.replyTo != null }
            .mapNotNull { it.replyTo }
            .toSet()
        return msgs
            .filter {
                it.direction == "q" && it.ciphertextInline != null && it.id !in answeredQuestionIds
            }
            .map { q ->
                val env = EncryptedEnvelope(
                    encCek = b64d(q.encCek), nonceKey = b64d(q.nonceKey),
                    noncePayload = b64d(q.noncePayload), ciphertext = b64d(q.ciphertextInline!!),
                )
                val qe: QuestionEnvelope = QaProtocol.decodeQuestion(crypto.decryptFromSender(env, questionerPub))
                IncomingQuestion(
                    threadId = thread.id, messageId = q.id, questionerUserId = thread.userId,
                    name = qe.name, phone = qe.phone, address = qe.address, text = qe.text,
                    audioRef = qe.audioRef, audioKeyB64 = qe.audioKeyB64, audioNonceB64 = qe.audioNonceB64,
                    createdAt = q.createdAt,
                )
            }
    }

    suspend fun fetchAudio(audioRef: String, audioKeyB64: String, audioNonceB64: String): ByteArray =
        withContext(Dispatchers.IO) {
            val dl = api.qaDownloadUrl(QaDownloadRequest(fileKey = audioRef))
            val resp = OkHttpClient().newCall(Request.Builder().url(dl.downloadUrl).get().build()).execute()
            if (!resp.isSuccessful) throw Exception("audio download failed: ${resp.code}")
            val enc = resp.body?.bytes() ?: throw Exception("empty audio")
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(b64d(audioKeyB64), "AES"), GCMParameterSpec(128, b64d(audioNonceB64)))
            cipher.doFinal(enc)
        }

    suspend fun sendAnswer(thread: QaThreadDto, replyToMessageId: String, answerText: String, answerAudio: ByteArray?): SendMessageResponse =
        withContext(Dispatchers.IO) {
            ensureRegistered()
            val questionerPub = questionerKey(thread.userId)

            var audioRef: String? = null; var audioKeyB64: String? = null; var audioNonceB64: String? = null
            if (answerAudio != null) {
                val rng = SecureRandom()
                val key = ByteArray(32).also { rng.nextBytes(it) }
                val nonce = ByteArray(12).also { rng.nextBytes(it) }
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
                val enc = cipher.doFinal(answerAudio)
                val up = api.qaUploadUrl(QaUploadRequest(threadId = thread.id))
                val ok = OkHttpClient().newCall(
                    Request.Builder().url(up.uploadUrl)
                        .put(enc.toRequestBody("application/octet-stream".toMediaType()))
                        .header("Content-Type", "application/octet-stream").build()
                ).execute().isSuccessful
                if (!ok) throw Exception("answer audio upload failed")
                audioRef = up.fileKey; audioKeyB64 = b64e(key); audioNonceB64 = b64e(nonce)
            }

            val kind = if (answerAudio != null) "audio" else "text"
            val envelope = AnswerEnvelope(kind = kind, text = answerText, audioRef = audioRef, audioKeyB64 = audioKeyB64, audioNonceB64 = audioNonceB64)
            val e: EncryptedEnvelope = crypto.encryptForRecipient(QaProtocol.encodeAnswer(envelope), questionerPub)
            api.sendQaMessage(
                SendMessageRequest(
                    threadId = thread.id, direction = "a", contentType = "text",
                    ciphertextInline = e.b64(e.ciphertext),
                    encCek = e.b64(e.encCek), nonceKey = e.b64(e.nonceKey), noncePayload = e.b64(e.noncePayload),
                    senderKeyId = myKeyId!!, byteSize = 0, replyTo = replyToMessageId,
                )
            )
        }
}
