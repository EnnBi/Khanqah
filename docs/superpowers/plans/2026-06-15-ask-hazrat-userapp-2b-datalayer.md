# Ask Hazrat — User App 2B: QA Data Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the native user app (`android/`) to the Q&A backend: register the device's X25519 public key, fetch + TOFU-pin the Shaykh's public key, send encrypted questions (text or audio), list threads/messages, and decrypt the Shaykh's answers — using the `QaCrypto` foundation from 2A. No UI yet (that's 2E).

**Architecture:** A `QaRepository` orchestrates the flow over a few new Retrofit endpoints on the existing `ApiService`. Every question is sent as a **single encrypted JSON envelope** (`QuestionEnvelope`) carrying the questioner's identity (name/phone/address) plus the Urdu text and, for audio, a reference to a separately-uploaded encrypted audio blob whose AES key rides *inside* the sealed envelope. This keeps one `crypto_box` per message and needs no change to the backend message model (the envelope is always sent as `content_type="text"` inline ciphertext). The Shaykh's public key is pinned on first fetch (TOFU) and answers are decrypted against it.

**Tech Stack:** Kotlin, Retrofit/Gson (existing `ApiService`/`ApiClient`), DataStore (pin + key-id storage), `QaCrypto`/`IdentityKeyStore` from 2A, OkHttp (blob PUT/GET, reusing the admin upload pattern).

This is **sub-plan 2B** (after 2A crypto). 2C (translate/TTS), 2D (audio capture), 2E (UI) follow.

---

## Backend prerequisite (small addition to the Go backend)

The backend can presign **uploads** (`POST /qa/upload`) but has no **download** path for encrypted audio blobs. Add one participant-gated endpoint so the app can fetch a blob back to decrypt it.

This is **Task 1** below and lives in `backend/`. It mirrors the existing `GenerateQAUploadURL` handler and the R2 client's presign-GET capability.

---

## Encrypted envelope protocol (the key design decision)

Every message's `ciphertext_inline` is the `crypto_box`+AES-GCM encryption (via `QaCrypto`) of this JSON:

```json
{
  "name": "…", "phone": "…", "address": "…",   // identity (questions only)
  "kind": "text" | "audio",
  "text": "…urdu…",                              // present for text; transcript for audio
  "audioRef": "qa/<uuid>/<n>.bin",               // audio only: R2 key of the encrypted blob
  "audioKeyB64": "…", "audioNonceB64": "…"       // audio only: AES-256-GCM key+IV for the blob
}
```

- The message is always sent with `direction` (`"q"`/`"a"`), `content_type="text"`, and the envelope in `ciphertext_inline`. The backend stores it opaquely.
- For **audio**, the audio bytes are AES-256-GCM-encrypted with a fresh `audioKey`/`audioNonce`, uploaded to R2 via `POST /qa/upload` (opaque blob), and the key+ref are placed **inside** the already-E2EE envelope — so the blob's key is itself protected by `crypto_box`. One `crypto_box` per message; the server still sees only ciphertext.
- **Answers** from the Shaykh use the same envelope shape (without identity fields). The user decrypts them with the **pinned Shaykh public key**.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/internal/handler/qa_upload.go` | Add `GenerateQADownloadURL` (presigned GET) — modify |
| `backend/internal/storage/r2.go` | Add `GenerateDownloadURL` if absent — modify |
| `backend/cmd/server/main.go` | Register `POST /qa/download` — modify |
| `android/…/data/model/QaModels.kt` | Retrofit DTOs for keys/messages/threads |
| `android/…/data/api/ApiService.kt` | Add QA endpoints — modify |
| `android/…/crypto/QaProtocol.kt` | `QuestionEnvelope`/`AnswerEnvelope` JSON + (de)serialize + base64 |
| `android/…/data/repository/QaRepository.kt` | Orchestration: register key, pin, send, list, decrypt |
| `android/…/data/api/ShaykhKeyStore.kt` | TOFU pin + own `sender_key_id` persistence (DataStore) |
| `android/…/KhanqahApp.kt` | Construct `QaRepository`; register key after login — modify |

Android gradle commands run from `android/`; Go commands from `backend/`.

---

### Task 1: Backend — presigned download for encrypted QA blobs

**Files:** Modify `backend/internal/storage/r2.go`, `backend/internal/handler/qa_upload.go`, `backend/cmd/server/main.go`.

- [ ] **Step 1: Ensure the R2 client can presign a GET**

In `backend/internal/storage/r2.go`, check for a download-presign method. If absent, add (mirroring `GenerateUploadURL` but using `PresignGetObject`):

```go
// GenerateDownloadURL returns a pre-signed GET URL for fileKey, valid 15 minutes.
func (c *R2Client) GenerateDownloadURL(ctx context.Context, fileKey string) (string, error) {
	req, err := c.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(fileKey),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}
```

> Match the existing field/receiver names in `r2.go` (e.g. how `GenerateUploadURL` references the presign client and bucket). Read the file first and mirror it exactly.

- [ ] **Step 2: Add the handler**

Append to `backend/internal/handler/qa_upload.go`:

```go
// GenerateQADownloadURL godoc
//	@Summary	Presigned R2 GET for an encrypted Q&A blob (participants only)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/download [post]
func GenerateQADownloadURL(r2 *storage.R2Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req struct {
			FileKey string `json:"file_key"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FileKey == "" {
			writeError(w, http.StatusBadRequest, "file_key is required")
			return
		}
		// Authorization: a user may only fetch blobs under their own prefix (qa/<their-uid>/...);
		// the shaykh may fetch any qa/ blob (answers reference questioners' blobs).
		prefixOwn := "qa/" + claims.UserID + "/"
		if claims.Role != "shaykh" && !strings.HasPrefix(req.FileKey, prefixOwn) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		if !strings.HasPrefix(req.FileKey, "qa/") {
			writeError(w, http.StatusBadRequest, "invalid file_key")
			return
		}
		url, err := r2.GenerateDownloadURL(r.Context(), req.FileKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate download URL")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"download_url": url})
	}
}
```

Add `"strings"` to the import block if not present.

- [ ] **Step 3: Register the route**

In `backend/cmd/server/main.go`, in the Listener (any valid JWT) group, after `/qa/upload`:

```go
			r.Post("/qa/download", handler.GenerateQADownloadURL(r2))
```

- [ ] **Step 4: Build**

Run from `backend/`: `go build ./... && go vet ./...`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/storage/r2.go backend/internal/handler/qa_upload.go backend/cmd/server/main.go
git commit -m "feat(backend): presigned download for encrypted qa blobs"
```

> Deploy note: this backend change must ship (new binary) before audio answers can be fetched. Text-only Q&A works without it.

---

### Task 2: Android QA DTOs

**Files:** Create `android/app/src/main/java/com/khanqah/app/data/model/QaModels.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.data.model

import com.google.gson.annotations.SerializedName

data class RegisterKeyRequest(
    @SerializedName("public_key") val publicKey: String, // base64
    val algo: String = "x25519",
)
data class RegisterKeyResponse(val id: String)

data class ShaykhKeyResponse(
    @SerializedName("user_id") val userId: String,
    @SerializedName("key_id") val keyId: String,
    @SerializedName("public_key") val publicKey: String, // base64
    val algo: String,
)

data class QaUploadRequest(@SerializedName("thread_id") val threadId: String = "")
data class QaUploadResponse(
    @SerializedName("upload_url") val uploadUrl: String,
    @SerializedName("file_key") val fileKey: String,
)

data class QaDownloadRequest(@SerializedName("file_key") val fileKey: String)
data class QaDownloadResponse(@SerializedName("download_url") val downloadUrl: String)

data class SendMessageRequest(
    @SerializedName("thread_id") val threadId: String? = null,
    val direction: String,                 // "q" | "a"
    @SerializedName("content_type") val contentType: String = "text",
    @SerializedName("ciphertext_inline") val ciphertextInline: String? = null, // base64
    @SerializedName("ciphertext_ref") val ciphertextRef: String? = null,
    @SerializedName("enc_cek") val encCek: String,        // base64
    @SerializedName("nonce_key") val nonceKey: String,    // base64
    @SerializedName("nonce_payload") val noncePayload: String, // base64
    @SerializedName("sender_key_id") val senderKeyId: String,
    @SerializedName("byte_size") val byteSize: Long = 0,
)
data class SendMessageResponse(
    val id: String,
    @SerializedName("thread_id") val threadId: String,
)

data class QaThreadDto(
    val id: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("shaykh_id") val shaykhId: String,
    val status: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("last_message_at") val lastMessageAt: String,
)

// Go marshals []byte as base64 strings; nullable bytea -> null.
data class QaMessageDto(
    val id: String,
    @SerializedName("thread_id") val threadId: String,
    @SerializedName("sender_id") val senderId: String,
    @SerializedName("recipient_id") val recipientId: String,
    val direction: String,
    @SerializedName("content_type") val contentType: String,
    @SerializedName("ciphertext_ref") val ciphertextRef: String?,
    @SerializedName("ciphertext_inline") val ciphertextInline: String?, // base64
    @SerializedName("enc_cek") val encCek: String,
    @SerializedName("nonce_key") val nonceKey: String,
    @SerializedName("nonce_payload") val noncePayload: String,
    @SerializedName("sender_key_id") val senderKeyId: String,
    @SerializedName("byte_size") val byteSize: Long,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("read_at") val readAt: String?,
)
```

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/QaModels.kt && git commit -m "feat(android): qa data-layer DTOs"`

---

### Task 3: ApiService QA endpoints

**Files:** Modify `android/app/src/main/java/com/khanqah/app/data/api/ApiService.kt`.

- [ ] **Step 1: Add endpoints** (inside the `ApiService` interface, using the existing `import com.khanqah.app.data.model.*`):

```kotlin
    @POST("keys")
    suspend fun registerKey(@Body body: RegisterKeyRequest): RegisterKeyResponse

    @GET("keys/shaykh")
    suspend fun getShaykhKey(): ShaykhKeyResponse

    @POST("qa/upload")
    suspend fun qaUploadUrl(@Body body: QaUploadRequest): QaUploadResponse

    @POST("qa/download")
    suspend fun qaDownloadUrl(@Body body: QaDownloadRequest): QaDownloadResponse

    @POST("qa/messages")
    suspend fun sendQaMessage(@Body body: SendMessageRequest): SendMessageResponse

    @GET("qa/threads")
    suspend fun listQaThreads(): List<QaThreadDto>

    @GET("qa/messages")
    suspend fun listQaMessages(@Query("thread_id") threadId: String): List<QaMessageDto>

    @POST("qa/messages/{id}/read")
    suspend fun markQaRead(@Path("id") id: String): retrofit2.Response<Unit>
```

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/ApiService.kt && git commit -m "feat(android): qa api endpoints"`

---

### Task 4: Envelope protocol

**Files:** Create `android/app/src/main/java/com/khanqah/app/crypto/QaProtocol.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.crypto

import com.google.gson.Gson

/** Plaintext payload that gets E2EE-encrypted into a message's ciphertext_inline. */
data class QuestionEnvelope(
    val name: String,
    val phone: String,
    val address: String,
    val kind: String,            // "text" | "audio"
    val text: String = "",
    val audioRef: String? = null,
    val audioKeyB64: String? = null,
    val audioNonceB64: String? = null,
)

/** The Shaykh's answer payload (no identity). */
data class AnswerEnvelope(
    val kind: String,            // "text" | "audio"
    val text: String = "",
    val audioRef: String? = null,
    val audioKeyB64: String? = null,
    val audioNonceB64: String? = null,
)

object QaProtocol {
    private val gson = Gson()
    fun encodeQuestion(e: QuestionEnvelope): ByteArray = gson.toJson(e).toByteArray(Charsets.UTF_8)
    fun decodeAnswer(bytes: ByteArray): AnswerEnvelope =
        gson.fromJson(String(bytes, Charsets.UTF_8), AnswerEnvelope::class.java)
    // For completeness / Shaykh app reuse:
    fun decodeQuestion(bytes: ByteArray): QuestionEnvelope =
        gson.fromJson(String(bytes, Charsets.UTF_8), QuestionEnvelope::class.java)
    fun encodeAnswer(e: AnswerEnvelope): ByteArray = gson.toJson(e).toByteArray(Charsets.UTF_8)
}
```

- [ ] **Step 2: Build + commit** — `./gradlew :app:assembleDebug --no-daemon`; `git add …/QaProtocol.kt && git commit -m "feat(android): qa encrypted-envelope protocol"`

---

### Task 5: Shaykh-key TOFU pin + key-id store

**Files:** Create `android/app/src/main/java/com/khanqah/app/data/api/ShaykhKeyStore.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.qaPinStore by preferencesDataStore("qa_pin")

/** Persists this device's registered key id and the TOFU-pinned Shaykh public key. */
class ShaykhKeyStore(private val context: Context) {
    private val MY_KEY_ID = stringPreferencesKey("my_key_id")
    private val SHAYKH_PUB = stringPreferencesKey("shaykh_public_b64")

    suspend fun myKeyId(): String? = context.qaPinStore.data.first()[MY_KEY_ID]
    suspend fun setMyKeyId(id: String) = context.qaPinStore.edit { it[MY_KEY_ID] = id }

    suspend fun pinnedShaykhKey(): String? = context.qaPinStore.data.first()[SHAYKH_PUB]
    suspend fun setPinnedShaykhKey(b64: String) = context.qaPinStore.edit { it[SHAYKH_PUB] = b64 }
}
```

- [ ] **Step 2: Build + commit** — `./gradlew :app:assembleDebug --no-daemon`; `git add …/ShaykhKeyStore.kt && git commit -m "feat(android): shaykh-key TOFU pin + key-id store"`

---

### Task 6: QaRepository

**Files:** Create `android/app/src/main/java/com/khanqah/app/data/repository/QaRepository.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.data.repository

import android.util.Base64
import com.khanqah.app.crypto.EncryptedEnvelope
import com.khanqah.app.crypto.IdentityKeyStore
import com.khanqah.app.crypto.QaCrypto
import com.khanqah.app.crypto.QaProtocol
import com.khanqah.app.crypto.QuestionEnvelope
import com.khanqah.app.crypto.AnswerEnvelope
import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.api.ShaykhKeyStore
import com.khanqah.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
    val text: String,
    val audioRef: String?,
    val audioKeyB64: String?,
    val audioNonceB64: String?,
    val readAt: String?,
)

class QaRepository(
    private val api: ApiService,
    private val identity: IdentityKeyStore,
    private val crypto: QaCrypto,
    private val keyStore: ShaykhKeyStore,
) {
    private fun b64e(b: ByteArray) = Base64.encodeToString(b, Base64.NO_WRAP)
    private fun b64d(s: String) = Base64.decode(s, Base64.NO_WRAP)

    /** Generate (if needed) + register this device's public key. Idempotent per install. */
    suspend fun ensureRegistered() {
        if (keyStore.myKeyId() != null) return
        val pub = identity.ensureKeypair()
        val resp = api.registerKey(RegisterKeyRequest(publicKey = b64e(pub)))
        keyStore.setMyKeyId(resp.id)
    }

    /** Fetch + TOFU-pin the Shaykh key. Throws ShaykhKeyChangedException if it changed. */
    suspend fun shaykhPublicKey(): ByteArray {
        val resp = api.getShaykhKey()
        val pinned = keyStore.pinnedShaykhKey()
        if (pinned == null) {
            keyStore.setPinnedShaykhKey(resp.publicKey)
        } else if (pinned != resp.publicKey) {
            throw ShaykhKeyChangedException()
        }
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

    /** [audioBytes] = the (already Urdu) audio to send. Encrypts + uploads it, refs it in the envelope. */
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
                .put(encAudio.toRequestBody("application/octet-stream".let { okhttp3.MediaType.parse(it) }))
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

    /** Decrypt all messages in a thread for display. Questions (our own) and answers (from Shaykh). */
    suspend fun threadMessages(threadId: String): List<DecryptedMessage> {
        val shaykhPub = shaykhPublicKey()
        return api.listQaMessages(threadId).map { m ->
            val inline = m.ciphertextInline
            val text: String; val aRef: String?; val aKey: String?; val aNonce: String?
            if (inline == null) {
                text = ""; aRef = null; aKey = null; aNonce = null
            } else {
                val env = EncryptedEnvelope(
                    encCek = b64d(m.encCek), nonceKey = b64d(m.nonceKey),
                    noncePayload = b64d(m.noncePayload), ciphertext = b64d(inline),
                )
                // Both our questions and the Shaykh's answers were sealed with crypto_box; the
                // other party for either direction (from our device's perspective) is the Shaykh.
                val plain = crypto.decryptFromSender(env, shaykhPub)
                if (m.direction == "a") {
                    val a = QaProtocol.decodeAnswer(plain)
                    text = a.text; aRef = a.audioRef; aKey = a.audioKeyB64; aNonce = a.audioNonceB64
                } else {
                    val q = QaProtocol.decodeQuestion(plain)
                    text = q.text; aRef = q.audioRef; aKey = q.audioKeyB64; aNonce = q.audioNonceB64
                }
            }
            DecryptedMessage(m.id, m.direction, m.createdAt, text, aRef, aKey, aNonce, m.readAt)
        }
    }

    /** Download + decrypt an audio blob referenced by an envelope. */
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
```

> **Implementer note:** the OkHttp `toRequestBody`/`MediaType` API — match the version in use (OkHttp 4.12). Prefer `encAudio.toRequestBody("application/octet-stream".toMediaType())` with `import okhttp3.MediaType.Companion.toMediaType`. Fix the import/call to compile cleanly (the admin `UploadRepository.kt` is a working reference for the exact OkHttp 4.x calls). Important crypto subtlety: when **decrypting our own past questions** for display, `decryptFromSender(env, shaykhPub)` works because `crypto_box` is symmetric in the (recipientPK, senderSK)/(senderPK, recipientSK) sense — opening a box we sealed to the Shaykh requires the Shaykh's secret key, which we DON'T have. **Therefore our own outgoing question text cannot be re-derived from the server copy.** Handle this in 2E by caching the plaintext of our own sent questions locally (Room), and only decrypt **answers** (`direction == "a"`) from the server. Adjust `threadMessages` to skip decrypting `direction == "q"` (show locally-cached text instead) — flag this and implement the local-cache read in 2E. For 2B, keep `threadMessages` decrypting only answers and returning empty text for our own questions, with a TODO referencing 2E.

- [ ] **Step 2: Build** — fix per the note until `./gradlew :app:assembleDebug --no-daemon` is `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/QaRepository.kt && git commit -m "feat(android): QaRepository — register, send, list, decrypt"`

---

### Task 7: Wire into KhanqahApp + register on login

**Files:** Modify `android/app/src/main/java/com/khanqah/app/KhanqahApp.kt`.

- [ ] **Step 1: Construct the QA stack** in `onCreate()` (after `apiClient`):

```kotlin
        val identityKeyStore = com.khanqah.app.crypto.IdentityKeyStore(this)
        val qaCrypto = com.khanqah.app.crypto.QaCrypto(identityKeyStore)
        val shaykhKeyStore = com.khanqah.app.data.api.ShaykhKeyStore(this)
        qaRepo = com.khanqah.app.data.repository.QaRepository(apiClient.service, identityKeyStore, qaCrypto, shaykhKeyStore)
```

Add the field: `lateinit var qaRepo: com.khanqah.app.data.repository.QaRepository`.

- [ ] **Step 2: Subscribe to the per-user push topic + register key after login**

The per-user content-free push uses FCM topic `user-<uuid>` (backend §6). After login (when a token + user id exist), subscribe and register the key. Add a method on `KhanqahApp`:

```kotlin
    fun onLoggedIn() {
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val uid = tokenManager.getUserId()
            if (uid.isNotBlank()) {
                FirebaseMessaging.getInstance().subscribeToTopic("user-$uid")
                runCatching { qaRepo.ensureRegistered() }
            }
        }
    }
```

> Use the app's existing coroutine pattern if one is established instead of `GlobalScope` (check how other post-login side effects are run; match it). Call `onLoggedIn()` from the auth success path (where `AuthViewModel`/`MainActivity` flips `isLoggedIn = true`) and once at startup in `onCreate()` if already logged in (`runBlocking { authRepo.isLoggedIn() }`).

- [ ] **Step 3: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 4: Commit** — `git add …/KhanqahApp.kt && git commit -m "feat(android): wire QaRepository + per-user push topic + key registration"`

---

## Self-Review

**Spec coverage:**
- §5 key registration (`POST /keys`) + TOFU Shaykh-key pin (`GET /keys/shaykh`) → Tasks 5–7 (`ensureRegistered`, `shaykhPublicKey`). ✓
- §6a identity (name/phone/address) bundled in the **encrypted** payload, never plaintext on server → `QuestionEnvelope` (Task 4) sealed by `QaCrypto`. ✓
- §2 send encrypted text/audio questions; audio blob encrypted + uploaded, key carried inside the sealed envelope → Task 6 (`sendTextQuestion`/`sendAudioQuestion`). ✓
- §6 per-user content-free push topic subscription (`user-<uuid>`) → Task 7. ✓
- Audio fetch-back gap → Task 1 backend `POST /qa/download` (participant-gated). ✓

**Out of scope (later):** Urdu translate/TTS that produces the audio bytes (2C), audio capture/playback UI (2D), screens + local plaintext cache of our own questions + biometric/FLAG_SECURE (2E).

**Placeholder scan:** No TBDs. Two flagged implementer notes (OkHttp `toRequestBody` exact call; the crypto_box limitation that our own outgoing questions can't be decrypted from the server copy and must be locally cached in 2E) — both are correctness guidance with a concrete resolution, not placeholders.

**Type consistency:** `EncryptedEnvelope`/`QaCrypto` usage matches 2A. DTO field names match the backend JSON (Go `[]byte`→base64 string; `sender_key_id`, `ciphertext_inline`, etc.). `keyStore.myKeyId()!!` is safe because `ensureRegistered()` runs first in every send path.

**Known correctness note (important):** `crypto_box` authenticated encryption means a sender cannot open a box they sealed to someone else. So the user's *own* question text is not recoverable from the server's stored ciphertext — 2E must show our outgoing questions from a local Room cache written at send time. This is called out in Task 6 and deferred to 2E, not hidden.
