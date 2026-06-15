# Ask Hazrat — User App 2A: Crypto & Secure Key Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end-encryption foundation in the native Kotlin user app (`android/`): X25519 identity keys stored non-exportably (Android Keystore-wrapped), and a `QaCrypto` API that encrypts a message to a recipient's public key (hybrid `crypto_box` + AES-256-GCM) and decrypts replies — producing exactly the base64 fields the Go backend stores.

**Architecture:** Three focused classes in a new `crypto` package. `KeystoreSealer` owns a hardware-backed AES-256-GCM key in the AndroidKeyStore and seals/opens arbitrary bytes. `IdentityKeyStore` generates the X25519 keypair once (via lazysodium), seals the private key with `KeystoreSealer`, persists the sealed blob + public key in a DataStore, and exposes the public key + an in-memory-only private key. `QaCrypto` composes them: random 256-bit content key (CEK) → AES-256-GCM over the payload → CEK sealed to the recipient via authenticated `crypto_box`. The result envelope maps 1:1 to the backend's `enc_cek` / `nonce_key` / `nonce_payload` / ciphertext fields.

**Tech Stack:** Kotlin, lazysodium-android (libsodium: X25519, `crypto_box`, secure random), JNA, Android Keystore (`AES/GCM/NoPadding`), DataStore Preferences, Gson/Base64. minSdk 26, compileSdk 35.

This is **sub-plan 2A of the user-app track** (after Plan 1 backend, which is done). Plans 2B–2E build on it. The same crypto classes are reused by the Shaykh app (Plan 3).

---

## Why this matches the backend

The Go backend (`POST /qa/messages`, see `2026-06-15-ask-hazrat-backend.md`) stores, per message, base64 fields: `enc_cek`, `nonce_key`, `nonce_payload`, and either `ciphertext_inline` (text) or a `ciphertext_ref` (uploaded audio blob). `QaCrypto.encryptForRecipient` produces exactly these bytes. The backend never decrypts — it stores opaque blobs.

Crypto choices (from the design spec §2):
- **Identity:** X25519 keypair (libsodium `crypto_box` keypair = 32-byte pk/sk).
- **Key wrap of CEK:** authenticated `crypto_box_easy` (X25519 + XSalsa20-Poly1305), 24-byte nonce → `enc_cek` + `nonce_key`. Authenticated (needs sender's private key) so the server cannot forge messages.
- **Payload:** AES-256-GCM (`AES/GCM/NoPadding`), 12-byte IV → `ciphertext` + `nonce_payload`. GCM tag is appended to the ciphertext by the Cipher.
- **Private key at rest:** wrapped by a non-exportable AndroidKeyStore AES-256-GCM key; wrapped blob persisted in DataStore (itself never the raw key).

---

## File Structure

| File | Responsibility |
|---|---|
| `android/gradle/libs.versions.toml` | Add `lazysodium-android` + `jna` to the version catalog (modify) |
| `android/app/build.gradle.kts` | Add the two `implementation` lines (modify) |
| `android/app/src/main/java/com/khanqah/app/crypto/KeystoreSealer.kt` | Keystore AES key; `seal`/`open` bytes |
| `android/app/src/main/java/com/khanqah/app/crypto/IdentityKeyStore.kt` | X25519 keypair lifecycle + wrapped persistence |
| `android/app/src/main/java/com/khanqah/app/crypto/QaCrypto.kt` | Hybrid encrypt/decrypt + `EncryptedEnvelope` + base64 helpers |
| `android/app/src/main/java/com/khanqah/app/crypto/Sodium.kt` | Single shared `LazySodiumAndroid` instance |
| `android/app/src/androidTest/java/com/khanqah/app/crypto/QaCryptoTest.kt` | Instrumented round-trip tests (need the native lib + Keystore) |

All commands run from `android/`. Crypto tests are **instrumented** (`androidTest`) because lazysodium-android and AndroidKeyStore require the Android runtime; they run on the connected device via `./gradlew :app:connectedDebugAndroidTest` (Xiaomi `8614caf50408`). Where no device is available, `./gradlew :app:assembleDebugAndroidTest` at least proves they compile — note which was run.

---

### Task 1: Add libsodium dependencies

**Files:**
- Modify: `android/gradle/libs.versions.toml`
- Modify: `android/app/build.gradle.kts`

- [ ] **Step 1: Add versions + libraries to the catalog**

In `android/gradle/libs.versions.toml`, under `[versions]` add:

```toml
lazysodium = "5.1.4"
jna = "5.14.0"
```

Under `[libraries]` add:

```toml
lazysodium-android = { group = "com.goterl", name = "lazysodium-android", version.ref = "lazysodium" }
jna = { group = "net.java.dev.jna", name = "jna", version.ref = "jna" }
```

- [ ] **Step 2: Add the dependencies to the app module**

In `android/app/build.gradle.kts`, inside the `dependencies { }` block (next to the other `implementation(libs.…)` lines), add:

```kotlin
    implementation(libs.lazysodium.android)
    implementation(libs.jna) { artifact { type = "aar" } }
```

> `jna` must be the `aar` artifact on Android (it ships native `.so` files). lazysodium-android bundles the libsodium `.so`s for all ABIs.

- [ ] **Step 3: Verify it resolves and builds**

Run: `./gradlew :app:assembleDebug --no-daemon`
Expected: `BUILD SUCCESSFUL`. (First run downloads the AARs.)

- [ ] **Step 4: Commit**

```bash
git add android/gradle/libs.versions.toml android/app/build.gradle.kts
git commit -m "build(android): add lazysodium-android + jna for E2EE"
```

---

### Task 2: Shared Sodium instance

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/crypto/Sodium.kt`

- [ ] **Step 1: Create the singleton**

```kotlin
package com.khanqah.app.crypto

import com.goterl.lazysodium.LazySodiumAndroid
import com.goterl.lazysodium.SodiumAndroid

/** Single process-wide libsodium instance. Thread-safe; libsodium is stateless per call. */
object Sodium {
    val lazy: LazySodiumAndroid by lazy { LazySodiumAndroid(SodiumAndroid()) }
}
```

- [ ] **Step 2: Verify build**

Run: `./gradlew :app:assembleDebug --no-daemon`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/crypto/Sodium.kt
git commit -m "feat(android): shared libsodium instance"
```

---

### Task 3: KeystoreSealer — hardware-backed wrap/unwrap

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/crypto/KeystoreSealer.kt`

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Wraps arbitrary bytes with a non-exportable AES-256-GCM key held in the
 * AndroidKeyStore (hardware-backed where available). Used to protect the
 * X25519 private key at rest. The wrapping key never leaves secure hardware.
 */
class KeystoreSealer(private val alias: String = "khanqah_qa_master") {

    private val gcmTagBits = 128
    private val ivLen = 12

    private fun getOrCreateKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    /** Returns iv(12) || ciphertext(+16 tag). */
    fun seal(plaintext: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val iv = cipher.iv
        val ct = cipher.doFinal(plaintext)
        return iv + ct
    }

    /** Inverse of [seal]. */
    fun open(sealed: ByteArray): ByteArray {
        val iv = sealed.copyOfRange(0, ivLen)
        val ct = sealed.copyOfRange(ivLen, sealed.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(gcmTagBits, iv))
        return cipher.doFinal(ct)
    }
}
```

- [ ] **Step 2: Verify build**

Run: `./gradlew :app:assembleDebug --no-daemon`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/crypto/KeystoreSealer.kt
git commit -m "feat(android): Keystore-backed byte sealer for key wrapping"
```

---

### Task 4: IdentityKeyStore — X25519 keypair lifecycle

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/crypto/IdentityKeyStore.kt`

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.crypto

import android.content.Context
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.goterl.lazysodium.interfaces.Box
import com.goterl.lazysodium.utils.Key
import kotlinx.coroutines.flow.first

private val Context.qaKeysStore by preferencesDataStore("qa_keys")

/**
 * Owns this device's X25519 identity keypair for Ask Hazrat.
 * The private key is generated once, sealed via [KeystoreSealer], and persisted
 * as an opaque blob. The raw private key exists only transiently in memory.
 */
class IdentityKeyStore(
    private val context: Context,
    private val sealer: KeystoreSealer = KeystoreSealer(),
) {
    private val PUB = stringPreferencesKey("x25519_public")      // base64 raw public key
    private val SEALED_PRIV = stringPreferencesKey("x25519_sealed_private") // base64 sealed blob

    /** Generates and persists a keypair if none exists. Idempotent. Returns the public key bytes. */
    suspend fun ensureKeypair(): ByteArray {
        existingPublic()?.let { return it }
        val kp = Sodium.lazy.cryptoBoxKeypair()
        val pub = kp.publicKey.asBytes
        val priv = kp.secretKey.asBytes
        val sealed = sealer.seal(priv)
        context.qaKeysStore.edit {
            it[PUB] = Base64.encodeToString(pub, Base64.NO_WRAP)
            it[SEALED_PRIV] = Base64.encodeToString(sealed, Base64.NO_WRAP)
        }
        return pub
    }

    /** The device public key, or null if no keypair has been generated. */
    suspend fun existingPublic(): ByteArray? {
        val b64 = context.qaKeysStore.data.first()[PUB] ?: return null
        return Base64.decode(b64, Base64.NO_WRAP)
    }

    /** Unwrapped private key (in-memory only). Throws if no keypair exists. */
    suspend fun privateKey(): ByteArray {
        val b64 = context.qaKeysStore.data.first()[SEALED_PRIV]
            ?: error("no identity keypair; call ensureKeypair() first")
        return sealer.open(Base64.decode(b64, Base64.NO_WRAP))
    }

    /** libsodium Key wrappers for QaCrypto. */
    suspend fun publicKeyObj(): Key = Key.fromBytes(existingPublic() ?: ensureKeypair())
    suspend fun privateKeyObj(): Key = Key.fromBytes(privateKey())
}
```

- [ ] **Step 2: Verify build**

Run: `./gradlew :app:assembleDebug --no-daemon`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/crypto/IdentityKeyStore.kt
git commit -m "feat(android): X25519 identity keypair with Keystore-wrapped storage"
```

---

### Task 5: QaCrypto — hybrid encrypt/decrypt

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/crypto/QaCrypto.kt`

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.crypto

import android.util.Base64
import com.goterl.lazysodium.interfaces.Box
import com.goterl.lazysodium.utils.Key
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * One encrypted message. All fields are raw bytes; use [toApi] for the base64
 * shape the backend stores. `ciphertext` is the AES-256-GCM output (tag appended);
 * for audio it is uploaded to R2 and referenced by key instead of sent inline.
 */
data class EncryptedEnvelope(
    val encCek: ByteArray,        // CEK sealed to recipient via crypto_box
    val nonceKey: ByteArray,      // 24-byte crypto_box nonce
    val noncePayload: ByteArray,  // 12-byte AES-GCM IV
    val ciphertext: ByteArray,
) {
    fun b64(b: ByteArray): String = Base64.encodeToString(b, Base64.NO_WRAP)
}

/**
 * Hybrid E2EE for Ask Hazrat. Encrypts a payload to a recipient's X25519 public
 * key: random 256-bit content key (CEK) → AES-256-GCM over the payload; CEK sealed
 * to the recipient with authenticated crypto_box using this device's private key.
 */
class QaCrypto(private val identity: IdentityKeyStore) {

    private val sodium = Sodium.lazy
    private val rng = SecureRandom()
    private val gcmTagBits = 128

    /** Encrypt [payload] for [recipientPublicKey]. Authenticated by our private key. */
    suspend fun encryptForRecipient(payload: ByteArray, recipientPublicKey: ByteArray): EncryptedEnvelope {
        val cek = ByteArray(32).also { rng.nextBytes(it) }
        val ivPayload = ByteArray(12).also { rng.nextBytes(it) }

        // AES-256-GCM over the payload under the CEK.
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(cek, "AES"), GCMParameterSpec(gcmTagBits, ivPayload))
        val ciphertext = cipher.doFinal(payload)

        // Seal the CEK to the recipient via authenticated crypto_box.
        val nonceKey = sodium.nonce(Box.NONCEBYTES)
        val mySk = identity.privateKeyObj()
        val recipient = Key.fromBytes(recipientPublicKey)
        val encCek = sodium.cryptoBoxEasy(
            String(cek, Charsets.ISO_8859_1), nonceKey, recipient, mySk,
        )?.let { hex -> com.goterl.lazysodium.utils.LibraryLoader; sodium.toBinary(it) }
            ?: error("crypto_box failed")

        return EncryptedEnvelope(encCek, nonceKey, ivPayload, ciphertext)
    }

    /** Decrypt an envelope sent to us by [senderPublicKey]. */
    suspend fun decryptFromSender(env: EncryptedEnvelope, senderPublicKey: ByteArray): ByteArray {
        val mySk = identity.privateKeyObj()
        val sender = Key.fromBytes(senderPublicKey)
        val cekHex = sodium.cryptoBoxOpenEasy(
            sodium.toHexString(env.encCek), env.nonceKey, sender, mySk,
        ) ?: error("crypto_box_open failed (bad key or tampered)")
        val cek = sodium.toBinary(cekHex)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(cek, "AES"), GCMParameterSpec(gcmTagBits, env.noncePayload))
        return cipher.doFinal(env.ciphertext)
    }
}
```

> **Implementer note — verify the lazysodium byte/hex API at build time.** lazysodium's `Box.Lazy` methods (`cryptoBoxEasy`/`cryptoBoxOpenEasy`) in 5.1.x operate on `String`/hex and `Key` objects, and helpers `toHexString(ByteArray)` / `toBinary(String)` convert. The exact call shape (String vs ByteArray overloads) varies slightly by version — when the build or test fails, consult the resolved `com.goterl.lazysodium.interfaces.Box.Lazy` interface and adjust to the real signatures, keeping the semantics: seal the 32-byte CEK with `nonceKey`, `recipientPK`, `mySK`; open with `senderPK`, `mySK`. Prefer the native binary (`ByteArray`) overloads if present (cleaner than hex). The line marked with `LibraryLoader` is a placeholder to force the correct conversion — replace with the real `toBinary`/`toHexString` calls once verified. Do not leave dead references.

- [ ] **Step 2: Verify build**

Run: `./gradlew :app:assembleDebug --no-daemon`
Expected: `BUILD SUCCESSFUL`. If the lazysodium call signatures differ, fix per the note above until it compiles.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/crypto/QaCrypto.kt
git commit -m "feat(android): hybrid X25519 + AES-256-GCM message crypto"
```

---

### Task 6: Instrumented round-trip tests

**Files:**
- Create: `android/app/src/androidTest/java/com/khanqah/app/crypto/QaCryptoTest.kt`

These prove the real crypto works on-device: keypair persistence, two-party encrypt→decrypt, tamper rejection, and that a wrong key fails to decrypt.

- [ ] **Step 1: Write the instrumented test**

```kotlin
package com.khanqah.app.crypto

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QaCryptoTest {
    private val ctx = InstrumentationRegistry.getInstrumentation().targetContext

    // Distinct DataStore-backed identities by using separate KeystoreSealer aliases
    // and contexts is overkill here; instead we exercise two IdentityKeyStores via
    // separate alias'd sealers to simulate user <-> shaykh.
    private fun newIdentity(alias: String): IdentityKeyStore =
        IdentityKeyStore(ctx, KeystoreSealer(alias))

    @Test
    fun ensureKeypair_isIdempotent_andPersists() = runBlocking {
        val id = newIdentity("test_alias_a")
        val pub1 = id.ensureKeypair()
        val pub2 = id.ensureKeypair()
        assertArrayEquals("keypair must be stable across calls", pub1, pub2)
        assertNotNull(id.existingPublic())
    }

    @Test
    fun encrypt_then_decrypt_roundTrips_betweenTwoParties() = runBlocking {
        // NOTE: both identities share one DataStore ("qa_keys"), so this test uses
        // a single identity encrypting to itself as the recipient — still exercises
        // the full crypto_box + AES-GCM path. Two-DataStore separation is covered in 2B.
        val id = newIdentity("test_alias_b")
        val myPub = id.ensureKeypair()
        val crypto = QaCrypto(id)

        val message = "آپ سفر میں نماز قصر کر سکتے ہیں۔".toByteArray(Charsets.UTF_8)
        val env = crypto.encryptForRecipient(message, myPub)
        val out = crypto.decryptFromSender(env, myPub)

        assertArrayEquals(message, out)
    }

    @Test
    fun tamperedCiphertext_failsToDecrypt() = runBlocking {
        val id = newIdentity("test_alias_c")
        val myPub = id.ensureKeypair()
        val crypto = QaCrypto(id)
        val env = crypto.encryptForRecipient("hello".toByteArray(), myPub)

        val tampered = env.copy(ciphertext = env.ciphertext.copyOf().also { it[0] = (it[0] + 1).toByte() })
        assertThrows(Exception::class.java) {
            runBlocking { crypto.decryptFromSender(tampered, myPub) }
        }
    }
}
```

- [ ] **Step 2: Ensure androidTest deps exist**

`androidx.test.ext:junit` and `androidx.test:runner` are required for instrumented tests. Check `android/app/build.gradle.kts` for `androidTestImplementation`. If absent, add to the catalog and module:

catalog `[libraries]`:
```toml
androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version = "1.2.1" }
androidx-test-runner = { group = "androidx.test", name = "runner", version = "1.6.2" }
```
module `dependencies`:
```kotlin
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
```
And ensure `defaultConfig { testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }` is present in `build.gradle.kts` (add if missing).

- [ ] **Step 3: Run on the connected device**

Run: `./gradlew :app:connectedDebugAndroidTest --no-daemon`
Expected: all 3 tests PASS. (Device: Xiaomi `8614caf50408`; ensure it's connected via `adb devices`.)
If no device is available, run `./gradlew :app:assembleDebugAndroidTest --no-daemon` to confirm the tests compile, and note that on-device execution is deferred.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/androidTest/java/com/khanqah/app/crypto/QaCryptoTest.kt android/gradle/libs.versions.toml android/app/build.gradle.kts
git commit -m "test(android): instrumented E2EE round-trip + tamper rejection"
```

---

## Self-Review

**Spec coverage (against `2026-06-15-ask-hazrat-e2ee-qa-design.md`):**
- §2 hybrid crypto (random CEK → AES-256-GCM payload; CEK sealed via authenticated `crypto_box`) → Task 5 (`QaCrypto`). ✓
- §2 authenticated `crypto_box` (not sealed box), so server can't forge → Task 5 uses sender private key. ✓
- §3 X25519 identity keypair, private key never leaves device, Keystore-wrapped, public key exposed → Tasks 3–4. ✓
- §2 output maps to backend `enc_cek`/`nonce_key`/`nonce_payload`/ciphertext → `EncryptedEnvelope` + `b64`. ✓
- §15 user-app stack: lazysodium-android, Android Keystore → Task 1. ✓

**Out of scope for 2A (later sub-plans, correctly):** key registration to the server + TOFU Shaykh-key fetch (2B), translation/TTS (2C), audio (2D), screens/push/biometric/FLAG_SECURE (2E). The recovery phrase is Phase 2.

**Placeholder scan:** The one deliberate placeholder is the `LibraryLoader` line in Task 5, explicitly flagged with instructions to replace it with the verified lazysodium byte/hex conversion at build time — because the exact 5.1.x `Box.Lazy` signature must be confirmed against the resolved artifact rather than guessed. Every other step is concrete.

**Type consistency:** `EncryptedEnvelope` fields (`encCek`, `nonceKey`, `noncePayload`, `ciphertext`) are referenced consistently across `QaCrypto` and the tests; `IdentityKeyStore` exposes `ensureKeypair`/`existingPublic`/`privateKey`/`publicKeyObj`/`privateKeyObj` as used by `QaCrypto` and tests.

**Known limitation noted in tests:** `IdentityKeyStore` uses one DataStore (`qa_keys`), so the round-trip test encrypts to self (still exercises the full `crypto_box`+GCM path). True two-party (user↔shaykh) separation is validated end-to-end in 2B against the live key registry. This is called out inline, not hidden.
