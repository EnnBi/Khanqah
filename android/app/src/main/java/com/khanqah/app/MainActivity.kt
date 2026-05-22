package com.khanqah.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.runtime.*
import com.khanqah.app.ui.navigation.AppNavGraph
import com.khanqah.app.ui.theme.KhanqahTheme
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as KhanqahApp
        val initialLoggedIn = runBlocking { app.authRepo.isLoggedIn() }
        val initialRole     = runBlocking { app.authRepo.getRole() }
        val initialName     = runBlocking { app.authRepo.getDisplayName() }
        val initialPhone    = runBlocking { app.authRepo.getPhone() }

        setContent {
            KhanqahTheme {
                val live     by app.homeViewModel.live.collectAsState()
                val schedule by app.homeViewModel.schedule.collectAsState()
                var isLoggedIn  by remember { mutableStateOf(initialLoggedIn) }
                var userRole    by remember { mutableStateOf(initialRole) }
                var displayName by remember { mutableStateOf(initialName) }
                var phone       by remember { mutableStateOf(initialPhone) }
                val scope = rememberCoroutineScope()

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
                    onLogout                       = {
                        scope.launch {
                            app.authRepo.logout()
                            isLoggedIn = false
                            userRole = null
                            displayName = ""
                            phone = ""
                        }
                    },
                )
            }
        }
    }
}
