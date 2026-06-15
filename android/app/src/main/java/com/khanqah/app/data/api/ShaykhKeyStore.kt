package com.khanqah.app.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.qaPinStore by preferencesDataStore("qa_pin")

class ShaykhKeyStore(private val context: Context) {
    private val MY_KEY_ID = stringPreferencesKey("my_key_id")
    private val SHAYKH_PUB = stringPreferencesKey("shaykh_public_b64")

    suspend fun myKeyId(): String? = context.qaPinStore.data.first()[MY_KEY_ID]
    suspend fun setMyKeyId(id: String) { context.qaPinStore.edit { it[MY_KEY_ID] = id } }

    suspend fun pinnedShaykhKey(): String? = context.qaPinStore.data.first()[SHAYKH_PUB]
    suspend fun setPinnedShaykhKey(b64: String) { context.qaPinStore.edit { it[SHAYKH_PUB] = b64 } }
}
