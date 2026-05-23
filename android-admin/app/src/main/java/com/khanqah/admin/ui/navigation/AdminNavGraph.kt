package com.khanqah.admin.ui.navigation

import android.content.Intent
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewModelScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.BroadcastForegroundService
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.live.LiveScreen
import kotlinx.coroutines.launch

@Composable
fun AdminNavGraph(app: AdminApp, startDestination: String) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = startDestination) {
        composable("login") {
            LoginScreen(viewModel = app.authViewModel) {
                app.liveViewModel.clearAuthExpired()
                app.liveViewModel.refresh()
                app.scheduleViewModel.refresh()
                navController.navigate("live") { popUpTo("login") { inclusive = true } }
            }
        }
        composable("live") {
            val ctx         = LocalContext.current
            val session     by app.liveViewModel.currentSession.collectAsState()

            LaunchedEffect(session) {
                val intent = Intent(ctx, BroadcastForegroundService::class.java)
                if (session != null) ctx.startForegroundService(intent)
                else ctx.stopService(intent)
            }
            val sessions    by app.scheduleViewModel.sessions.collectAsState()
            val categories  by app.liveViewModel.categories.collectAsState()
            val isStreaming    by app.liveViewModel.isStreaming.collectAsState()
            val error         by app.liveViewModel.error.collectAsState()
            val authExpired   by app.liveViewModel.authExpired.collectAsState()
            val listenerCount by app.liveViewModel.listenerCount.collectAsState()

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
                listenerCount  = listenerCount,
                onStart        = { categoryId, en, ur, record -> app.liveViewModel.start(categoryId, en, ur, record) },
                onEnd          = { id -> app.liveViewModel.end(id) },
            )
        }
    }
}
