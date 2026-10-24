package com.ennbi.khanqah.data.repository

import com.ennbi.khanqah.data.api.ApiService
import com.ennbi.khanqah.data.api.TokenManager
import com.ennbi.khanqah.data.model.AuthResponse

class AuthRepository(private val api: ApiService, private val tokenManager: TokenManager) {

    suspend fun sendOtp(phone: String) {
        api.sendOtp(mapOf("phone" to phone))
    }

    suspend fun verifyOtp(phone: String, otp: String, name: String = ""): AuthResponse {
        val body = buildMap<String, String> {
            put("phone", phone)
            put("otp", otp)
            if (name.isNotBlank()) put("name", name)
        }
        val result = api.verifyOtp(body)
        tokenManager.saveTokens(
            access = result.accessToken,
            refresh = result.refreshToken,
            role = result.role,
            displayName = result.displayName,
            userId = result.userId,
            phone = phone,
        )
        return result
    }

    suspend fun logout() = tokenManager.clear()

    suspend fun getRole()        = tokenManager.getRole()
    suspend fun getDisplayName() = tokenManager.getDisplayName()
    suspend fun getPhone()       = tokenManager.getPhone()
    suspend fun isLoggedIn()     = tokenManager.getAccessToken() != null
}
