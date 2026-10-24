package com.ennbi.khanqah

import android.app.Application
import com.google.firebase.messaging.FirebaseMessaging
import com.ennbi.khanqah.data.api.ApiClient
import com.ennbi.khanqah.data.api.TokenManager
import com.ennbi.khanqah.data.db.AppDatabase
import com.ennbi.khanqah.data.repository.AuthRepository
import com.ennbi.khanqah.data.repository.CategoryRepository
import com.ennbi.khanqah.data.repository.ContentRepository
import com.ennbi.khanqah.data.repository.ProgressRepository
import com.ennbi.khanqah.data.repository.QaRepository
import com.ennbi.khanqah.ui.auth.AuthViewModel
import com.ennbi.khanqah.ui.home.HomeViewModel
import com.ennbi.khanqah.ui.library.CategoryDetailViewModel
import com.ennbi.khanqah.ui.library.LibraryViewModel
import com.ennbi.khanqah.ui.player.PlayerViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class KhanqahApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var contentRepo: ContentRepository
    lateinit var categoryRepo: CategoryRepository
    lateinit var progressRepo: ProgressRepository
    lateinit var qaRepo: QaRepository
    lateinit var makeQaViewModel: () -> com.ennbi.khanqah.ui.qa.QaViewModel
    lateinit var settingsStore: com.ennbi.khanqah.data.SettingsStore
    lateinit var authViewModel: AuthViewModel
    lateinit var homeViewModel: HomeViewModel
    lateinit var libraryViewModel: LibraryViewModel
    val nowPlayingManager = NowPlayingManager()
    val liveStreamPlayer = LiveStreamPlayer()

    override fun onCreate() {
        super.onCreate()
        ListeningForegroundService.createChannel(this)
        PlaybackNotificationService.createChannel(this)
        settingsStore = com.ennbi.khanqah.data.SettingsStore(this)
        // Subscribe to broadcast topics only if the user hasn't turned notifications off.
        CoroutineScope(Dispatchers.IO).launch {
            if (settingsStore.notificationsEnabled.first()) {
                FirebaseMessaging.getInstance().subscribeToTopic("broadcast_live")
                FirebaseMessaging.getInstance().subscribeToTopic("content_upload")
            }
        }
        val db = AppDatabase.getInstance(this)
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        contentRepo = ContentRepository(apiClient.service, db)
        categoryRepo = CategoryRepository(apiClient.service, db)
        progressRepo = ProgressRepository(apiClient.service)
        val identityKeyStore = com.ennbi.khanqah.crypto.IdentityKeyStore(this)
        val qaCrypto = com.ennbi.khanqah.crypto.QaCrypto(identityKeyStore)
        val shaykhKeyStore = com.ennbi.khanqah.data.api.ShaykhKeyStore(this)
        qaRepo = QaRepository(apiClient.service, identityKeyStore, qaCrypto, shaykhKeyStore)
        val urduPipeline = com.ennbi.khanqah.qa.UrduPipeline(this)
        val sentQuestionDao = db.sentQuestionDao()
        val qaPrefs = com.ennbi.khanqah.ui.qa.QaPrefs(this)
        makeQaViewModel = {
            com.ennbi.khanqah.ui.qa.QaViewModel(
                qaRepo, urduPipeline, sentQuestionDao, com.ennbi.khanqah.qa.AudioPlayer(this), qaPrefs
            )
        }
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

    /** Persist the notifications preference and (un)subscribe the broadcast topics. */
    fun setNotifications(on: Boolean) {
        CoroutineScope(Dispatchers.IO).launch {
            settingsStore.setNotificationsEnabled(on)
            val fm = FirebaseMessaging.getInstance()
            listOf("broadcast_live", "content_upload").forEach {
                if (on) fm.subscribeToTopic(it) else fm.unsubscribeFromTopic(it)
            }
        }
    }

    fun makePlayerViewModel(contentId: String) =
        PlayerViewModel(contentRepo, progressRepo, this)

    fun makeCategoryDetailViewModel(categoryId: String) =
        CategoryDetailViewModel(contentRepo, progressRepo, categoryId)
}
