package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.api.TokenManager
import com.khanqah.app.data.model.AuthResponse

class AuthRepository(private val api: ApiService, private val tokenManager: TokenManager) {

    suspend fun sendOtp(phone: String) {
        api.sendOtp(mapOf("phone" to phone))
    }

    suspend fun verifyOtp(phone: String, otp: String): AuthResponse {
        val result = api.verifyOtp(mapOf("phone" to phone, "otp" to otp))
        tokenManager.saveTokens(result.accessToken, result.refreshToken, result.role)
        return result
    }

    suspend fun logout() = tokenManager.clear()

    suspend fun getRole() = tokenManager.getRole()
    suspend fun isLoggedIn() = tokenManager.getAccessToken() != null
}
