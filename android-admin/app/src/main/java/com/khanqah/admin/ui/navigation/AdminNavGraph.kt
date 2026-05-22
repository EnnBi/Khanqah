package com.khanqah.admin.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.live.LiveScreen

@Composable
fun AdminNavGraph(app: AdminApp, startDestination: String) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = startDestination) {
        composable("login") {
            LoginScreen(viewModel = app.authViewModel) {
                app.liveViewModel.refresh()
                app.scheduleViewModel.refresh()
                navController.navigate("live") { popUpTo("login") { inclusive = true } }
            }
        }
        composable("live") {
            val session  by app.liveViewModel.currentSession.collectAsState()
            val sessions by app.scheduleViewModel.sessions.collectAsState()
            LiveScreen(
                currentSession = session,
                sessions = sessions,
                onStart = { en, ur, url -> app.liveViewModel.start(en, ur, url) },
                onEnd   = { id -> app.liveViewModel.end(id) },
            )
        }
    }
}
