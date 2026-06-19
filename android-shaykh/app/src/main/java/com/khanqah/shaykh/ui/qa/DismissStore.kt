package com.khanqah.shaykh.ui.qa

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.qaDismissStore by preferencesDataStore("qa_dismissed")

/** Questions Hazrat chose to leave ("چھوڑ دیں"). Kept on-device so they don't reappear in the
 *  feed; the asker simply receives no answer. */
class DismissStore(private val context: Context) {
    private val KEY = stringSetPreferencesKey("dismissed_message_ids")
    suspend fun load(): Set<String> = context.qaDismissStore.data.first()[KEY] ?: emptySet()
    suspend fun add(messageId: String) {
        context.qaDismissStore.edit { it[KEY] = (it[KEY] ?: emptySet()) + messageId }
    }
}
