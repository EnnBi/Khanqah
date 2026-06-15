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
