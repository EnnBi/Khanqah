package com.khanqah.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.khanqah.app.ui.navigation.AppNavGraph
import com.khanqah.app.ui.navigation.Screen
import com.khanqah.app.ui.theme.KhanqahTheme
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as KhanqahApp
        val isLoggedIn = runBlocking { app.authRepo.isLoggedIn() }

        setContent {
            KhanqahTheme {
                AppNavGraph(
                    authViewModel = app.authViewModel,
                    homeViewModel = app.homeViewModel,
                    playerViewModelFactory = { app.makePlayerViewModel(it) },
                    startDestination = if (isLoggedIn) Screen.Home.route else Screen.Login.route,
                )
            }
        }
    }
}
