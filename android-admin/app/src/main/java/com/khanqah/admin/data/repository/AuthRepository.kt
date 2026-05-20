package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService
import com.khanqah.admin.data.api.TokenManager

private val ADMIN_ROLES = setOf("editor", "admin", "broadcaster")

class AuthRepository(private val api: AdminApiService, private val tokenManager: TokenManager) {

    suspend fun sendOtp(phone: String) { api.sendOtp(mapOf("phone" to phone)) }

    suspend fun verifyOtp(phone: String, otp: String): Result<Unit> {
        return try {
            val result = api.verifyOtp(mapOf("phone" to phone, "otp" to otp))
            if (result.role !in ADMIN_ROLES) {
                Result.failure(Exception("Access denied. This app is for editors and admins only."))
            } else {
                tokenManager.saveTokens(result.accessToken, result.refreshToken, result.role)
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRole() = tokenManager.getRole()
    suspend fun isLoggedIn() = tokenManager.getAccessToken() != null
    suspend fun logout() = tokenManager.clear()
}
