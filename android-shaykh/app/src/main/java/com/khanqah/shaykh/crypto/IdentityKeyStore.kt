package com.khanqah.shaykh.crypto

import android.content.Context
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
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
    private val PUB = stringPreferencesKey("x25519_public")
    private val SEALED_PRIV = stringPreferencesKey("x25519_sealed_private")

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
