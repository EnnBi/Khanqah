package com.khanqah.app.ui.qa

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.qaProfileStore by preferencesDataStore("qa_profile")

/** Caches the questioner's identity (name/phone/address) for prefill. Address lives only here.
 *  Also tracks which answered threads have been opened, to drive the unread dot in the list. */
class QaPrefs(private val context: Context) {
    private val NAME = stringPreferencesKey("name")
    private val PHONE = stringPreferencesKey("phone")
    private val ADDRESS = stringPreferencesKey("address")
    private val SEEN = stringSetPreferencesKey("seen_threads")

    suspend fun load(): Triple<String, String, String> {
        val p = context.qaProfileStore.data.first()
        return Triple(p[NAME] ?: "", p[PHONE] ?: "", p[ADDRESS] ?: "")
    }
    suspend fun save(name: String, phone: String, address: String) {
        context.qaProfileStore.edit { it[NAME] = name; it[PHONE] = phone; it[ADDRESS] = address }
    }

    suspend fun loadSeenThreads(): Set<String> =
        context.qaProfileStore.data.first()[SEEN] ?: emptySet()

    suspend fun markThreadSeen(threadId: String) {
        context.qaProfileStore.edit { p ->
            p[SEEN] = (p[SEEN] ?: emptySet()) + threadId
        }
    }
}
