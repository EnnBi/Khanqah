package com.khanqah.admin.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("admin-auth")

class TokenManager(private val context: Context) {
    private val ACCESS = stringPreferencesKey("access_token")
    private val REFRESH = stringPreferencesKey("refresh_token")
    private val ROLE = stringPreferencesKey("role")

    // Emitted when an authenticated request fails and the session cannot be
    // recovered (no/expired refresh token). Observed by the nav graph to route to login.
    private val _authExpired = MutableStateFlow(false)
    val authExpired = _authExpired.asStateFlow()
    fun notifyAuthExpired() { _authExpired.value = true }
    fun clearAuthExpired() { _authExpired.value = false }

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
