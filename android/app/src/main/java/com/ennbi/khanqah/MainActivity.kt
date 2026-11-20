package com.ennbi.khanqah

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.first
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalLayoutDirection
import com.ennbi.khanqah.data.SettingsStore
import androidx.compose.ui.unit.LayoutDirection
import com.ennbi.khanqah.ui.navigation.AppNavGraph
import com.ennbi.khanqah.ui.theme.KhanqahTheme
import com.ennbi.khanqah.ui.utils.LocalIsUrdu
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {

    private var openLiveState      = mutableStateOf(false)
    private var openPlayerState    = mutableStateOf(false)
    private var openAskState       = mutableStateOf(false)
    private var openAskThreadState = mutableStateOf<String?>(null)

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        when (intent.action) {
            ListeningForegroundService.ACTION_OPEN_LIVE -> openLiveState.value = true
            PlaybackNotificationService.ACTION_OPEN_PLAYER -> openPlayerState.value = true
            KhanqahFirebaseMessagingService.ACTION_OPEN_ASK -> {
                openAskState.value = true
                openAskThreadState.value = intent.getStringExtra(KhanqahFirebaseMessagingService.EXTRA_THREAD_ID)
            }
        }
    }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    /** Without this prompt, Android 13+ silently drops the live and new-content pushes. */
    private fun askForNotificationsOnce(app: KhanqahApp) {
        val ask = runBlocking {
            shouldAskOnLaunch(
                sdkInt = Build.VERSION.SDK_INT,
                granted = !needsNotificationPermission(),
                enabledInApp = app.settingsStore.notificationsEnabled.first(),
                alreadyAsked = app.settingsStore.notificationPermissionAsked(),
            )
        }
        if (!ask) return
        lifecycleScope.launch { app.settingsStore.setNotificationPermissionAsked() }
        notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as KhanqahApp
        askForNotificationsOnce(app)
        val initialLoggedIn = runBlocking { app.authRepo.isLoggedIn() }
        val initialRole     = runBlocking { app.authRepo.getRole() }
        val initialName     = runBlocking { app.authRepo.getDisplayName() }
        val initialPhone    = runBlocking { app.authRepo.getPhone() }
        val initialLanguage = runBlocking { app.tokenManager.getLanguage() }
        val initialTheme    = runBlocking { app.settingsStore.themeModeNow() }
        if (intent?.action == ListeningForegroundService.ACTION_OPEN_LIVE) {
            openLiveState.value = true
        }
        if (intent?.action == PlaybackNotificationService.ACTION_OPEN_PLAYER) {
            openPlayerState.value = true
        }
        if (intent?.action == KhanqahFirebaseMessagingService.ACTION_OPEN_ASK) {
            openAskState.value = true
            openAskThreadState.value = intent.getStringExtra(KhanqahFirebaseMessagingService.EXTRA_THREAD_ID)
        }

        setContent {
            val themeMode by app.settingsStore.themeMode.collectAsState(initial = initialTheme)
            val darkTheme = when (themeMode) {
                SettingsStore.ThemeMode.LIGHT -> false
                SettingsStore.ThemeMode.DARK -> true
                SettingsStore.ThemeMode.SYSTEM -> isSystemInDarkTheme()
            }
            KhanqahTheme(darkTheme = darkTheme) {
                val live      by app.homeViewModel.live.collectAsState()
                val schedule  by app.homeViewModel.schedule.collectAsState()
                val language  by app.tokenManager.observeLanguage().collectAsState(initial = initialLanguage)
                var isLoggedIn  by remember { mutableStateOf(initialLoggedIn) }
                var userRole    by remember { mutableStateOf(initialRole) }
                var displayName by remember { mutableStateOf(initialName) }
                var phone       by remember { mutableStateOf(initialPhone) }
                val scope = rememberCoroutineScope()

                val layoutDirection = if (language == "ur") LayoutDirection.Rtl else LayoutDirection.Ltr

                androidx.compose.runtime.CompositionLocalProvider(
                    LocalLayoutDirection provides layoutDirection,
                    LocalIsUrdu provides (language == "ur"),
                ) {
                    val openLive      by openLiveState
                    val openPlayer    by openPlayerState
                    val openAsk       by openAskState
                    val openAskThread by openAskThreadState
                    AppNavGraph(
                        authViewModel                  = app.authViewModel,
                        homeViewModel                  = app.homeViewModel,
                        libraryViewModel               = app.libraryViewModel,
                        playerViewModelFactory         = { app.makePlayerViewModel(it) },
                        categoryDetailViewModelFactory = { app.makeCategoryDetailViewModel(it) },
                        liveSession                    = live,
                        scheduleList                   = schedule,
                        isLoggedIn                     = isLoggedIn,
                        displayName                    = displayName,
                        phone                          = phone,
                        userRole                       = userRole,
                        isUrdu                         = language == "ur",
                        openLive                       = openLive,
                        openPlayer                     = openPlayer,
                        openAsk                        = openAsk,
                        openAskThread                  = openAskThread,
                        onLanguageToggle               = {
                            scope.launch {
                                app.tokenManager.setLanguage(if (language == "ur") "en" else "ur")
                            }
                        },
                        onLogout = {
                            scope.launch {
                                app.authRepo.logout()
                                isLoggedIn = false
                                userRole = null
                                displayName = ""
                                phone = ""
                            }
                        },
                        onLoginSuccess = {
                            // Flip synchronously so the Ask gate sees a logged-in state before it
                            // composes (avoids a re-bounce to Login); refresh profile fields async.
                            isLoggedIn = true
                            scope.launch {
                                userRole = app.authRepo.getRole()
                                displayName = app.authRepo.getDisplayName()
                                phone = app.authRepo.getPhone()
                            }
                        },
                    )
                }
            }
        }
    }
}
