package com.khanqah.admin.ui.navigation

import androidx.compose.runtime.*
import androidx.lifecycle.viewModelScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.live.LiveScreen
import kotlinx.coroutines.launch

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
            val session     by app.liveViewModel.currentSession.collectAsState()
            val sessions    by app.scheduleViewModel.sessions.collectAsState()
            val categories  by app.liveViewModel.categories.collectAsState()
            val isStreaming by app.liveViewModel.isStreaming.collectAsState()
            val error       by app.liveViewModel.error.collectAsState()
            val authExpired by app.liveViewModel.authExpired.collectAsState()

            if (authExpired) {
                LaunchedEffect(Unit) {
                    app.liveViewModel.viewModelScope.launch { app.authRepo.logout() }
                    app.authViewModel.reset()
                    navController.navigate("login") { popUpTo("live") { inclusive = true } }
                }
            }

            LiveScreen(
                currentSession = session,
                sessions       = sessions,
                categories     = categories,
                isStreaming    = isStreaming,
                error          = error,
                onStart        = { categoryId, en, ur -> app.liveViewModel.start(categoryId, en, ur) },
                onEnd          = { id -> app.liveViewModel.end(id) },
            )
        }
    }
}
