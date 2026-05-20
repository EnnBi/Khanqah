package com.khanqah.app

import android.app.Application
import com.khanqah.app.data.api.ApiClient
import com.khanqah.app.data.api.TokenManager
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.repository.AuthRepository
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.player.PlayerViewModel

class KhanqahApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var contentRepo: ContentRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var homeViewModel: HomeViewModel

    override fun onCreate() {
        super.onCreate()
        val db = AppDatabase.getInstance(this)
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        contentRepo = ContentRepository(apiClient.service, db)
        authViewModel = AuthViewModel(authRepo)
        homeViewModel = HomeViewModel(contentRepo, apiClient.service)
    }

    fun makePlayerViewModel(contentId: String) = PlayerViewModel(contentRepo, this)
}
