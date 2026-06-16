package com.khanqah.shaykh

import android.app.Application
import com.khanqah.shaykh.data.api.ApiClient
import com.khanqah.shaykh.data.api.TokenManager
import com.khanqah.shaykh.data.repository.AuthRepository
import com.khanqah.shaykh.ui.auth.AuthViewModel

class ShaykhApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var authViewModel: AuthViewModel

    override fun onCreate() {
        super.onCreate()
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        authViewModel = AuthViewModel(authRepo)
    }
}
