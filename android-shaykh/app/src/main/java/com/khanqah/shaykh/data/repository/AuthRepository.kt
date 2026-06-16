package com.khanqah.shaykh.data.repository

import com.khanqah.shaykh.data.api.ApiService
import com.khanqah.shaykh.data.api.TokenManager

class AuthRepository(private val api: ApiService, private val tokenManager: TokenManager) {

    suspend fun sendOtp(phone: String) { api.sendOtp(mapOf("phone" to phone)) }

    suspend fun verifyOtp(phone: String, otp: String): Result<Unit> {
        return try {
            val result = api.verifyOtp(mapOf("phone" to phone, "otp" to otp))
            tokenManager.saveTokens(result.accessToken, result.refreshToken, result.role)
            result.displayName?.let { tokenManager.saveDisplayName(it) }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRole() = tokenManager.getRole()
    suspend fun getDisplayName() = tokenManager.getDisplayName() ?: ""
    suspend fun isLoggedIn() = tokenManager.getAccessToken() != null
    suspend fun logout() = tokenManager.clear()
}
