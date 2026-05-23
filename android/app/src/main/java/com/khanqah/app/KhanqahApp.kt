package com.khanqah.app

import android.app.Application
import com.khanqah.app.data.api.ApiClient
import com.khanqah.app.data.api.TokenManager
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.repository.AuthRepository
import com.khanqah.app.data.repository.CategoryRepository
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.library.CategoryDetailViewModel
import com.khanqah.app.ui.library.LibraryViewModel
import com.khanqah.app.ui.player.PlayerViewModel

class KhanqahApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var contentRepo: ContentRepository
    lateinit var categoryRepo: CategoryRepository
    lateinit var progressRepo: ProgressRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var homeViewModel: HomeViewModel
    lateinit var libraryViewModel: LibraryViewModel
    val nowPlayingManager = NowPlayingManager()
    val liveStreamPlayer = LiveStreamPlayer()

    override fun onCreate() {
        super.onCreate()
        ListeningForegroundService.createChannel(this)
        PlaybackNotificationService.createChannel(this)
        val db = AppDatabase.getInstance(this)
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        contentRepo = ContentRepository(apiClient.service, db)
        categoryRepo = CategoryRepository(apiClient.service, db)
        progressRepo = ProgressRepository(apiClient.service)
        authViewModel = AuthViewModel(authRepo)
        homeViewModel = HomeViewModel(contentRepo, apiClient.service)
        libraryViewModel = LibraryViewModel(categoryRepo, contentRepo)
    }

    fun makePlayerViewModel(contentId: String) =
        PlayerViewModel(contentRepo, progressRepo, this)

    fun makeCategoryDetailViewModel(categoryId: String) =
        CategoryDetailViewModel(contentRepo, progressRepo, categoryId)
}
