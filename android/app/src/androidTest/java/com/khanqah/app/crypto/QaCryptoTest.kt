package com.khanqah.app.crypto

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QaCryptoTest {
    private val ctx = InstrumentationRegistry.getInstrumentation().targetContext

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
    fun encrypt_then_decrypt_roundTrips() = runBlocking {
        // Single identity (one shared "qa_keys" DataStore): encrypt to self,
        // still exercises the full crypto_box + AES-GCM path. True two-party
        // separation is validated in sub-plan 2B against the live key registry.
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
