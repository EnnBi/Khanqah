package com.khanqah.shaykh.crypto

import android.util.Base64
import com.goterl.lazysodium.interfaces.Box
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * One encrypted message. Raw bytes; use [b64] for the base64 shape the backend stores.
 * `ciphertext` is the AES-256-GCM output (GCM tag appended). For audio it is uploaded
 * to R2 and referenced by key instead of sent inline.
 */
data class EncryptedEnvelope(
    val encCek: ByteArray,        // CEK sealed to recipient via crypto_box (MAC + 32)
    val nonceKey: ByteArray,      // 24-byte crypto_box nonce
    val noncePayload: ByteArray,  // 12-byte AES-GCM IV
    val ciphertext: ByteArray,
) {
    fun b64(b: ByteArray): String = Base64.encodeToString(b, Base64.NO_WRAP)
}

/**
 * Hybrid E2EE for Ask Hazrat. Random 256-bit CEK → AES-256-GCM over the payload;
 * CEK sealed to the recipient with authenticated crypto_box using this device's
 * private key (server cannot forge messages).
 */
class QaCrypto(private val identity: IdentityKeyStore) {

    private val sodium = Sodium.lazy
    private val rng = SecureRandom()
    private val gcmTagBits = 128

    suspend fun encryptForRecipient(payload: ByteArray, recipientPublicKey: ByteArray): EncryptedEnvelope {
        val cek = ByteArray(32).also { rng.nextBytes(it) }
        val ivPayload = ByteArray(12).also { rng.nextBytes(it) }

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(cek, "AES"), GCMParameterSpec(gcmTagBits, ivPayload))
        val ciphertext = cipher.doFinal(payload)

        val nonceKey = sodium.nonce(Box.NONCEBYTES)
        val mySk = identity.privateKey()
        val encCek = ByteArray(Box.MACBYTES + cek.size)
        val ok = sodium.cryptoBoxEasy(encCek, cek, cek.size.toLong(), nonceKey, recipientPublicKey, mySk)
        if (!ok) error("crypto_box failed")

        return EncryptedEnvelope(encCek, nonceKey, ivPayload, ciphertext)
    }

    suspend fun decryptFromSender(env: EncryptedEnvelope, senderPublicKey: ByteArray): ByteArray {
        val mySk = identity.privateKey()
        val cek = ByteArray(env.encCek.size - Box.MACBYTES)
        val ok = sodium.cryptoBoxOpenEasy(cek, env.encCek, env.encCek.size.toLong(), env.nonceKey, senderPublicKey, mySk)
        if (!ok) error("crypto_box_open failed (bad key or tampered)")

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(cek, "AES"), GCMParameterSpec(gcmTagBits, env.noncePayload))
        return cipher.doFinal(env.ciphertext)
    }
}
