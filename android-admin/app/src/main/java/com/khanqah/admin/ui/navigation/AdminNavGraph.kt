package com.khanqah.admin.ui.navigation

import android.content.Intent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.BroadcastForegroundService
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.bugs.BugsScreen
import com.khanqah.admin.ui.categories.CategoryScreen
import com.khanqah.admin.ui.content.ContentListScreen
import com.khanqah.admin.ui.home.HomeScreen
import com.khanqah.admin.ui.more.MoreScreen
import com.khanqah.admin.ui.schedule.ScheduleScreen
import com.khanqah.admin.ui.settings.SettingsScreen
import com.khanqah.admin.ui.team.TeamScreen
import com.khanqah.admin.ui.upload.UploadScreen
import kotlinx.coroutines.launch

private val TAB_ROUTES = setOf("home", "content", "schedule", "more")

@Composable
fun AdminNavGraph(app: AdminApp, startDestination: String) {
    val navController = rememberNavController()
    val moreScope = rememberCoroutineScope()
    val backstackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backstackEntry?.destination?.route

    val liveAuthExpired by app.liveViewModel.authExpired.collectAsState()
    val sessionExpired by app.tokenManager.authExpired.collectAsState()
    if (liveAuthExpired || sessionExpired) {
        LaunchedEffect(Unit) {
            app.liveViewModel.clearAuthExpired()
            app.tokenManager.clearAuthExpired()
            app.authViewModel.reset()
            navController.navigate("login") { popUpTo(0) { inclusive = true } }
        }
    }

    Scaffold(
        bottomBar = {
            if (currentRoute in TAB_ROUTES) {
                AdminBottomNavBar(currentRoute = currentRoute ?: "home") { route ->
                    navController.navigate(route) {
                        popUpTo("home") { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController    = navController,
            startDestination = startDestination,
            modifier         = Modifier.padding(innerPadding),
        ) {
            composable("login") {
                LoginScreen(viewModel = app.authViewModel) {
                    app.liveViewModel.clearAuthExpired()
                    app.tokenManager.clearAuthExpired()
                    // Reload everything with the fresh token (admin endpoints 401'd before login).
                    app.liveViewModel.refresh()
                    app.scheduleViewModel.refresh()
                    app.contentViewModel.refresh()
                    app.categoryViewModel.refresh()
                    app.teamViewModel.refresh()
                    app.bugsViewModel.refresh()
                    app.homeViewModel.refresh()
                    app.settingsViewModel.refresh()
                    navController.navigate("home") { popUpTo("login") { inclusive = true } }
                }
            }
            composable("home") {
                val ctx = LocalContext.current
                val session by app.liveViewModel.currentSession.collectAsState()
                val sessions by app.scheduleViewModel.sessions.collectAsState()
                LaunchedEffect(session) {
                    val intent = Intent(ctx, BroadcastForegroundService::class.java)
                    if (session != null) ctx.startForegroundService(intent)
                    else ctx.stopService(intent)
                }
                HomeScreen(
                    liveViewModel       = app.liveViewModel,
                    homeViewModel       = app.homeViewModel,
                    sessions            = sessions,
                    onNavigateToBugs    = { navController.navigate("bugs") },
                    onNavigateToContent = {
                        navController.navigate("content") {
                            popUpTo("home") { saveState = true }
                            launchSingleTop = true
                            restoreState    = true
                        }
                    },
                )
            }
            composable("content") {
                val items      by app.contentViewModel.items.collectAsState()
                val categories by app.contentViewModel.categories.collectAsState()
                ContentListScreen(
                    items        = items,
                    categories   = categories,
                    onDelete     = { app.contentViewModel.delete(it) },
                    onUpdate     = { id, en, ur, catId -> app.contentViewModel.update(id, en, ur, catId) },
                    onUploadClick = { navController.navigate("upload") },
                )
            }
            composable("upload") {
                val categories by app.contentViewModel.categories.collectAsState()
                UploadScreen(viewModel = app.uploadViewModel, categories = categories)
            }
            composable("schedule") {
                val sessions by app.scheduleViewModel.sessions.collectAsState()
                ScheduleScreen(
                    sessions  = sessions,
                    onCreate  = { en, ur, at, recurring, rule -> app.scheduleViewModel.create(en, ur, at, recurring, rule) },
                    onUpdate  = { id, en, ur, at, recurring, rule -> app.scheduleViewModel.update(id, en, ur, at, recurring, rule) },
                    onDelete  = { app.scheduleViewModel.delete(it) },
                )
            }
            composable("more") {
                MoreScreen(
                    onNavigateTeam       = { navController.navigate("team") },
                    onNavigateCategories = { navController.navigate("categories") },
                    onNavigateBugs       = { navController.navigate("bugs") },
                    onNavigateSettings   = { navController.navigate("settings") },
                    onLogout             = {
                        moreScope.launch {
                            app.authRepo.logout()
                            app.tokenManager.notifyAuthExpired()
                        }
                    },
                )
            }
            composable("team") {
                val users by app.teamViewModel.users.collectAsState()
                TeamScreen(
                    users        = users,
                    onRoleChange = { id, role -> app.teamViewModel.updateRole(id, role) },
                    onDelete     = { app.teamViewModel.deleteUser(it) },
                    onNameChange = { id, name -> app.teamViewModel.updateName(id, name) },
                )
            }
            composable("categories") {
                val categories by app.categoryViewModel.categories.collectAsState()
                CategoryScreen(
                    categories = categories,
                    onCreate   = { en, ur -> app.categoryViewModel.create(en, ur) },
                    onUpdate   = { id, en, ur -> app.categoryViewModel.update(id, en, ur) },
                    onDelete   = { app.categoryViewModel.delete(it) },
                )
            }
            composable("bugs") {
                val reports by app.bugsViewModel.reports.collectAsState()
                BugsScreen(reports = reports)
            }
            composable("settings") {
                val settings by app.settingsViewModel.settings.collectAsState()
                SettingsScreen(
                    settings = settings,
                    onToggle = { key, enabled -> app.settingsViewModel.toggle(key, enabled) },
                )
            }
        }
    }
}
