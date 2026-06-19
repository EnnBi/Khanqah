package com.khanqah.app.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("auth")

class TokenManager(private val context: Context) {
    private val ACCESS       = stringPreferencesKey("access_token")
    private val REFRESH      = stringPreferencesKey("refresh_token")
    private val ROLE         = stringPreferencesKey("role")
    private val DISPLAY_NAME = stringPreferencesKey("display_name")
    private val USER_ID      = stringPreferencesKey("user_id")
    private val PHONE        = stringPreferencesKey("phone")
    private val LANGUAGE     = stringPreferencesKey("language")

    suspend fun getAccessToken()  = context.dataStore.data.map { it[ACCESS] }.first()
    suspend fun getRefreshToken() = context.dataStore.data.map { it[REFRESH] }.first()
    suspend fun getRole()         = context.dataStore.data.map { it[ROLE] }.first()
    suspend fun getDisplayName()  = context.dataStore.data.map { it[DISPLAY_NAME] ?: "" }.first()
    suspend fun getUserId()       = context.dataStore.data.map { it[USER_ID] ?: "" }.first()
    suspend fun getPhone()        = context.dataStore.data.map { it[PHONE] ?: "" }.first()

    suspend fun saveTokens(access: String, refresh: String, role: String, displayName: String, userId: String, phone: String) {
        context.dataStore.edit {
            it[ACCESS]       = access
            it[REFRESH]      = refresh
            it[ROLE]         = role
            it[DISPLAY_NAME] = displayName
            it[USER_ID]      = userId
            it[PHONE]        = phone
        }
    }

    suspend fun saveAccessToken(access: String) {
        context.dataStore.edit { it[ACCESS] = access }
    }

    /** Persist the rotated pair returned by /auth/refresh. The backend deletes the old
     *  refresh token on every refresh, so the new one MUST be stored or the next refresh 401s. */
    suspend fun saveRefreshedTokens(access: String, refresh: String) {
        context.dataStore.edit {
            it[ACCESS]  = access
            it[REFRESH] = refresh
        }
    }

    fun observeLanguage(): Flow<String> =
        context.dataStore.data.map { it[LANGUAGE] ?: "en" }

    suspend fun getLanguage(): String = observeLanguage().first()

    suspend fun setLanguage(lang: String) {
        context.dataStore.edit { it[LANGUAGE] = lang }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
