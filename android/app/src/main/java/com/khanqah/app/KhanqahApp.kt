package com.khanqah.app

import android.app.Application
import com.google.firebase.messaging.FirebaseMessaging
import com.khanqah.app.data.api.ApiClient
import com.khanqah.app.data.api.TokenManager
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.repository.AuthRepository
import com.khanqah.app.data.repository.CategoryRepository
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import com.khanqah.app.data.repository.QaRepository
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.library.CategoryDetailViewModel
import com.khanqah.app.ui.library.LibraryViewModel
import com.khanqah.app.ui.player.PlayerViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class KhanqahApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var contentRepo: ContentRepository
    lateinit var categoryRepo: CategoryRepository
    lateinit var progressRepo: ProgressRepository
    lateinit var qaRepo: QaRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var homeViewModel: HomeViewModel
    lateinit var libraryViewModel: LibraryViewModel
    val nowPlayingManager = NowPlayingManager()
    val liveStreamPlayer = LiveStreamPlayer()

    override fun onCreate() {
        super.onCreate()
        ListeningForegroundService.createChannel(this)
        PlaybackNotificationService.createChannel(this)
        FirebaseMessaging.getInstance().subscribeToTopic("broadcast_live")
        FirebaseMessaging.getInstance().subscribeToTopic("content_upload")
        val db = AppDatabase.getInstance(this)
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        contentRepo = ContentRepository(apiClient.service, db)
        categoryRepo = CategoryRepository(apiClient.service, db)
        progressRepo = ProgressRepository(apiClient.service)
        val identityKeyStore = com.khanqah.app.crypto.IdentityKeyStore(this)
        val qaCrypto = com.khanqah.app.crypto.QaCrypto(identityKeyStore)
        val shaykhKeyStore = com.khanqah.app.data.api.ShaykhKeyStore(this)
        qaRepo = QaRepository(apiClient.service, identityKeyStore, qaCrypto, shaykhKeyStore)
        authViewModel = AuthViewModel(authRepo)
        homeViewModel = HomeViewModel(contentRepo, apiClient.service)
        libraryViewModel = LibraryViewModel(categoryRepo, contentRepo)
        CoroutineScope(Dispatchers.IO).launch {
            if (authRepo.isLoggedIn()) onLoggedIn()
        }
    }

    fun onLoggedIn() {
        CoroutineScope(Dispatchers.IO).launch {
            val uid = tokenManager.getUserId()
            if (uid.isNotBlank()) {
                FirebaseMessaging.getInstance().subscribeToTopic("user-$uid")
                runCatching { qaRepo.ensureRegistered() }
            }
        }
    }

    fun makePlayerViewModel(contentId: String) =
        PlayerViewModel(contentRepo, progressRepo, this)

    fun makeCategoryDetailViewModel(categoryId: String) =
        CategoryDetailViewModel(contentRepo, progressRepo, categoryId)
}
