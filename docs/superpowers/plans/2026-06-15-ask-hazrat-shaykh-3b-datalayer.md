# Ask Hazrat — Shaykh App 3B: Crypto + QA Data Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Shaykh app (`android-shaykh/`) the ability to register its keypair (which becomes *the* Shaykh public key users encrypt to), pull the queue of all question threads, decrypt each questioner's question (text + audio), and send an encrypted answer back. No UI yet (3C). Also fix a backend authorization gap so users can actually fetch the Shaykh's answer audio.

**Architecture:** Copy the proven crypto stack (2A `crypto/` package) and QA DTOs/API into the Shaykh project (per the copy-not-share decision). A `ShaykhRepository` orchestrates: register key → list threads → for a thread, fetch + decrypt the question (using the *questioner's* public key from `GET /keys/{userId}`, which is Shaykh-gated) → record/encrypt an answer to the questioner's key → send. The answer envelope mirrors the user app's `AnswerEnvelope`.

**Tech Stack:** Kotlin, lazysodium-android (X25519/`crypto_box`/AES-GCM — copied 2A), Retrofit/Gson, the Go QA backend. Backend: a small Go change to `/qa/download`.

This is **sub-plan 3B** (after 3A scaffold). 3C adds audio capture/playback + the two screens + biometric. The crypto here is byte-for-byte the user app's, so user↔Shaykh `crypto_box` interop is guaranteed.

---

## Crypto interop (why this just works)
The user encrypts a question with `crypto_box(cek, nonce, recipientPK = shaykhPub, senderSK = userPriv)`. The Shaykh opens it with `crypto_box_open(enc_cek, nonce, senderPK = userPub, recipientSK = shaykhPriv)` — i.e. `QaCrypto.decryptFromSender(env, senderPublicKey = questionerPub)`. Answers go the other way: `encryptForRecipient(payload, recipientPublicKey = questionerPub)` (sealed with the Shaykh's private key); the user opens with the pinned Shaykh key. Same `QaCrypto`/`QaProtocol` classes on both sides → identical wire format.

---

### Task 1: Backend — participant-gated `/qa/download` (fix answer-audio access)

The 2B download handler only allowed a user to fetch blobs under their own `qa/<uid>/` prefix. But answer audio is uploaded under the **Shaykh's** prefix, so users can't fetch it. Replace the prefix check with proper **thread-participant** gating: you may fetch a blob iff you're a participant of the thread whose message references it.

**Files:** `backend/internal/db/query/qa.sql`, `backend/internal/handler/qa_upload.go`.

- [ ] **Step 1: Add a query** to `backend/internal/db/query/qa.sql`:
```sql
-- name: GetMessageByCiphertextRef :one
SELECT m.*, t.user_id AS thread_user_id, t.shaykh_id AS thread_shaykh_id
FROM qa_messages m JOIN qa_threads t ON t.id = m.thread_id
WHERE m.ciphertext_ref = $1
LIMIT 1;
```
Run `make sqlc` (from `backend/`) → regenerates `GetMessageByCiphertextRef` returning a row with `ThreadUserID`/`ThreadShaykhID` (verify exact generated names).

- [ ] **Step 2: Rewrite the authz block** in `GenerateQADownloadURL` (`backend/internal/handler/qa_upload.go`). Replace the prefix-ownership check with:
```go
		if !strings.HasPrefix(req.FileKey, "qa/") {
			writeError(w, http.StatusBadRequest, "invalid file_key")
			return
		}
		// Participant gating: the requester must be a participant of the thread whose
		// message references this blob. (Blob is E2EE ciphertext regardless.)
		row, err := q.GetMessageByCiphertextRef(r.Context(), &req.FileKey) // pointer if column is nullable; else req.FileKey
		if err != nil {
			writeError(w, http.StatusNotFound, "blob not found")
			return
		}
		if !qa.CanAccessThread(claims.UserID, uuidString(row.ThreadUserID), uuidString(row.ThreadShaykhID)) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
```
Add imports: the `qa` package (`khanqah/api/internal/qa`) and ensure `dbgen` `q := dbgen.New(pool)` is available — **note:** `GenerateQADownloadURL` currently takes only `*storage.R2Client`. Change its signature to `GenerateQADownloadURL(pool *pgxpool.Pool, r2 *storage.R2Client)`, build `q := dbgen.New(pool)` inside, and update the route registration in `main.go` to `handler.GenerateQADownloadURL(pool, r2)`. Match `ciphertext_ref` nullability: the generated arg type is `*string` (column is nullable) — pass `&req.FileKey`; if sqlc generated `string`, pass `req.FileKey`. Build will tell you.

- [ ] **Step 3: Build** — from `backend/`: `go build ./... && go vet ./...` → exit 0.
- [ ] **Step 4: Commit** — `git add backend/ && git commit -m "fix(backend): participant-gate qa/download by thread (was own-prefix only)"`

> Deploys with the QA backend binary. Without it, audio answers can't be fetched by users.

---

### Task 2: Shaykh app — add lazysodium + jna

**Files:** `android-shaykh/gradle/libs.versions.toml`, `android-shaykh/app/build.gradle.kts`.

- [ ] **Step 1:** Mirror the user app's additions. Under `[versions]`: `lazysodium = "5.1.0"`, `jna = "5.14.0"`. Under `[libraries]`:
```toml
lazysodium-android = { group = "com.goterl", name = "lazysodium-android", version.ref = "lazysodium" }
jna = { group = "net.java.dev.jna", name = "jna", version.ref = "jna" }
```
- [ ] **Step 2:** In `android-shaykh/app/build.gradle.kts` `dependencies { }`:
```kotlin
    implementation(libs.lazysodium.android) {
        exclude(group = "net.java.dev.jna", module = "jna")
    }
    implementation(libs.jna) { artifact { type = "aar" } }
```
- [ ] **Step 3: Build** — from `android-shaykh/`: `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 4: Commit** — `git add android-shaykh && git commit -m "build(shaykh): add lazysodium + jna"`

---

### Task 3: Copy the crypto package

**Files:** create `android-shaykh/app/src/main/java/com/khanqah/shaykh/crypto/{Sodium,KeystoreSealer,IdentityKeyStore,QaCrypto,QaProtocol}.kt`.

- [ ] **Step 1: Copy + repackage** from the user app:
```bash
mkdir -p android-shaykh/app/src/main/java/com/khanqah/shaykh/crypto
for f in Sodium KeystoreSealer IdentityKeyStore QaCrypto QaProtocol; do
  sed 's/^package com.khanqah.app.crypto/package com.khanqah.shaykh.crypto/' \
    android/app/src/main/java/com/khanqah/app/crypto/$f.kt \
    > android-shaykh/app/src/main/java/com/khanqah/shaykh/crypto/$f.kt
done
```
(These files have no other `com.khanqah.app` imports — they only use `com.goterl...`, `android.*`, `androidx.datastore`, `javax.crypto`. Verify with a grep; fix any stray `com.khanqah.app` reference to `com.khanqah.shaykh`.)

- [ ] **Step 2:** `QaProtocol.kt` includes `QuestionEnvelope`, `AnswerEnvelope`, and encode/decode for both — the Shaykh needs `decodeQuestion` and `encodeAnswer` (both already present in the copied file). Good.

- [ ] **Step 3: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 4: Commit** — `git add android-shaykh && git commit -m "feat(shaykh): copy E2EE crypto package from user app"`

---

### Task 4: QA DTOs + ApiService endpoints

**Files:** create `…/data/model/QaModels.kt`; modify `…/data/api/ApiService.kt`.

- [ ] **Step 1: Copy the QA DTOs** (repackage) — the Shaykh needs the same models plus the key-by-user response:
```bash
sed 's/^package com.khanqah.app.data.model/package com.khanqah.shaykh.data.model/' \
  android/app/src/main/java/com/khanqah/app/data/model/QaModels.kt \
  > android-shaykh/app/src/main/java/com/khanqah/shaykh/data/model/QaModels.kt
```
Then ADD to that file a DTO for `GET /keys/{userId}` (same shape as `ShaykhKeyResponse`):
```kotlin
data class UserKeyResponse(
    @SerializedName("user_id") val userId: String,
    @SerializedName("key_id") val keyId: String,
    @SerializedName("public_key") val publicKey: String,
    val algo: String,
)
```

- [ ] **Step 2: Add QA endpoints** to `…/data/api/ApiService.kt` (it has `import com.khanqah.shaykh.data.model.*`):
```kotlin
    @POST("keys")
    suspend fun registerKey(@Body body: RegisterKeyRequest): RegisterKeyResponse

    @GET("keys/{userId}")
    suspend fun getUserKey(@Path("userId") userId: String): UserKeyResponse

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
```
(Need `import retrofit2.http.Path`/`Query` — the file already imports `retrofit2.http.*`.)

- [ ] **Step 3: Build + commit** — `./gradlew :app:assembleDebug --no-daemon`; `git add android-shaykh && git commit -m "feat(shaykh): qa DTOs + api endpoints"`

---

### Task 5: ShaykhRepository

**Files:** create `android-shaykh/app/src/main/java/com/khanqah/shaykh/data/repository/ShaykhRepository.kt`.

- [ ] **Step 1: Implement**

```kotlin
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

/** A decrypted question ready for the UI (3C). */
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

    /** Generate + register the Shaykh keypair (becomes THE shaykh public key). Idempotent-ish. */
    suspend fun ensureRegistered() {
        if (myKeyId != null) return
        val pub = identity.ensureKeypair()
        myKeyId = api.registerKey(RegisterKeyRequest(publicKey = b64e(pub))).id
    }

    private suspend fun questionerKey(userId: String): ByteArray =
        b64d(api.getUserKey(userId).publicKey)

    /** Threads needing an answer (status != answered), newest activity first. */
    suspend fun pendingThreads(): List<QaThreadDto> =
        api.listQaThreads().filter { it.status != "answered" }

    /** All open threads (for a full queue/count). */
    suspend fun allThreads(): List<QaThreadDto> = api.listQaThreads()

    /** Fetch + decrypt the latest question in a thread. */
    suspend fun openQuestion(thread: QaThreadDto): IncomingQuestion {
        ensureRegistered()
        val questionerPub = questionerKey(thread.userId)
        val msgs = api.listQaMessages(thread.id)
        val q = msgs.lastOrNull { it.direction == "q" && it.ciphertextInline != null }
            ?: error("no question in thread")
        val env = EncryptedEnvelope(
            encCek = b64d(q.encCek), nonceKey = b64d(q.nonceKey),
            noncePayload = b64d(q.noncePayload), ciphertext = b64d(q.ciphertextInline!!),
        )
        val qe: QuestionEnvelope = QaProtocol.decodeQuestion(crypto.decryptFromSender(env, questionerPub))
        return IncomingQuestion(
            threadId = thread.id, messageId = q.id, questionerUserId = thread.userId,
            name = qe.name, phone = qe.phone, address = qe.address, text = qe.text,
            audioRef = qe.audioRef, audioKeyB64 = qe.audioKeyB64, audioNonceB64 = qe.audioNonceB64,
            createdAt = q.createdAt,
        )
    }

    /** Download + decrypt a question's audio blob. */
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

    /** Send an answer (audio and/or text) encrypted to the questioner. */
    suspend fun sendAnswer(
        thread: QaThreadDto, answerText: String, answerAudio: ByteArray?,
    ): SendMessageResponse = withContext(Dispatchers.IO) {
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
                senderKeyId = myKeyId!!, byteSize = 0,
            )
        )
    }
}
```

> **Implementer notes:** (1) `QaProtocol.encodeAnswer`/`decodeQuestion` + `QuestionEnvelope`/`AnswerEnvelope` come from the copied `QaProtocol.kt` — confirm they're present (they are in the user app's copy). (2) Match OkHttp 4.x `toRequestBody`/`toMediaType` (same as the admin `UploadRepository`). (3) `SendMessageRequest` has `byteSize` non-null with default 0 — fine. (4) Build will flag any DTO field-name mismatch; fix against the copied `QaModels.kt`.

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add android-shaykh && git commit -m "feat(shaykh): ShaykhRepository — register, queue, decrypt question, send answer"`

---

### Task 6: Wire into ShaykhApp + register key on login

**Files:** modify `android-shaykh/app/src/main/java/com/khanqah/shaykh/ShaykhApp.kt`.

- [ ] **Step 1:** In `onCreate()` after `apiClient`, construct the QA stack and a factory; subscribe the Shaykh's per-user push topic + register key after login (mirroring the user app's `onLoggedIn`). The Shaykh's own per-user topic lets users... actually the Shaykh receives "new question" pushes on his `user-<shaykhUid>` topic (questions sent to him set recipient = shaykh). So subscribe `user-<uid>` too.

```kotlin
        val identityKeyStore = com.khanqah.shaykh.crypto.IdentityKeyStore(this)
        val qaCrypto = com.khanqah.shaykh.crypto.QaCrypto(identityKeyStore)
        shaykhRepo = com.khanqah.shaykh.data.repository.ShaykhRepository(apiClient.service, identityKeyStore, qaCrypto)
```
Add field `lateinit var shaykhRepo: com.khanqah.shaykh.data.repository.ShaykhRepository`.

Add an `onLoggedIn()` that (on IO) reads the user id from TokenManager, subscribes FCM topic `user-<uid>` (add Firebase messaging dep + google-services if not already present in the shaykh project — CHECK; the admin clone may not have FCM. If FCM isn't set up in android-shaykh, SKIP the topic subscribe for now and just `shaykhRepo.ensureRegistered()`, noting push is deferred to 3D), and calls `runCatching { shaykhRepo.ensureRegistered() }`. Call `onLoggedIn()` at startup if logged in and from the login-success path (in `ShaykhNavGraph`/wherever `onSuccess` fires).

> **Note:** FCM/google-services may not be configured in the cloned shaykh project. If `FirebaseMessaging`/google-services plugin is absent, do NOT add it here — just register the key on login, and leave Shaykh push notifications to **3D** (which sets up FCM + the CI build). Report whether FCM was present.

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add android-shaykh && git commit -m "feat(shaykh): wire ShaykhRepository + register key on login"`

---

## Self-Review

**Spec coverage:**
- §5 Shaykh fetches a user's key (`GET /keys/{userId}`, Shaykh-gated) to encrypt the answer / decrypt the question → `questionerKey()` (Task 5). ✓
- §2 decrypt question (questioner pub + Shaykh priv) + encrypt answer (questioner pub, sealed by Shaykh priv) → `openQuestion`/`sendAnswer` via copied `QaCrypto`. ✓
- §3 Shaykh keypair generated + registered = the published Shaykh key → `ensureRegistered` (Tasks 5–6). ✓
- §6a identity shown to Shaykh → `IncomingQuestion` carries name/phone/address from the decrypted envelope. ✓
- Answer audio fetchable by the user → Task 1 backend participant-gating fix. ✓

**Out of scope (3C/3D):** `AudioRecorder`/`AudioPlayer` (copied in 3C), the two screens, biometric, FLAG_SECURE; FCM setup + CI build + downloads (3D).

**Placeholder scan:** none. The FCM "may be absent in the clone" note (Task 6) is a real branch with a defined fallback (skip push, defer to 3D), not a blank.

**Type consistency:** copied `crypto`/`QaModels` keep the user app's exact shapes (interop guaranteed). `ShaykhRepository` surface (`ensureRegistered`, `pendingThreads`/`allThreads`, `openQuestion → IncomingQuestion`, `fetchAudio`, `sendAnswer`) is what 3C's ViewModel/screens will consume. Backend `GetMessageByCiphertextRef` generated names verified at `make sqlc` time (Task 1).

**Security note (stated):** `/qa/download` now gates by thread participation (not just blob-prefix), so both the Shaykh (fetch question audio) and the user (fetch answer audio) can retrieve blobs in their own threads, and no one else can — while the blob stays E2EE ciphertext regardless.
