package com.khanqah.admin.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("admin-auth")

class TokenManager(private val context: Context) {
    private val ACCESS = stringPreferencesKey("access_token")
    private val REFRESH = stringPreferencesKey("refresh_token")
    private val ROLE = stringPreferencesKey("role")

    suspend fun getAccessToken() = context.dataStore.data.map { it[ACCESS] }.first()
    suspend fun getRefreshToken() = context.dataStore.data.map { it[REFRESH] }.first()
    suspend fun getRole() = context.dataStore.data.map { it[ROLE] }.first()

    suspend fun saveTokens(access: String, refresh: String, role: String) {
        context.dataStore.edit { it[ACCESS] = access; it[REFRESH] = refresh; it[ROLE] = role }
    }

    suspend fun saveAccessToken(access: String) {
        context.dataStore.edit { it[ACCESS] = access }
    }

    suspend fun clear() = context.dataStore.edit { it.clear() }
}
