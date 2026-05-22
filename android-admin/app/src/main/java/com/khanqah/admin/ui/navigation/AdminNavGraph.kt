package com.khanqah.admin.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.bugs.BugsScreen
import com.khanqah.admin.ui.content.ContentListScreen
import com.khanqah.admin.ui.live.LiveScreen
import com.khanqah.admin.ui.schedule.ScheduleScreen
import com.khanqah.admin.ui.team.TeamScreen
import com.khanqah.admin.ui.upload.UploadScreen
import kotlinx.coroutines.launch

private data class NavItem(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

private val mainRoutes = listOf(
    NavItem("content", "Content", Icons.Default.VideoLibrary),
    NavItem("schedule", "Schedule", Icons.Default.DateRange),
    NavItem("live", "Live", Icons.Default.PlayCircle),
    NavItem("team", "Team", Icons.Default.Group),
    NavItem("bugs", "Bugs", Icons.Default.BugReport),
)

@Composable
fun AdminNavGraph(app: AdminApp, startDestination: String) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    val showBottomNav = currentRoute != "login" && currentRoute != "upload"

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar {
                    mainRoutes.forEach { item ->
                        NavigationBarItem(
                            selected = currentRoute == item.route,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo("content") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) },
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(padding),
        ) {
            composable("login") {
                LoginScreen(viewModel = app.authViewModel) {
                    app.contentViewModel.refresh()
                    app.scheduleViewModel.refresh()
                    app.liveViewModel.refresh()
                    app.teamViewModel.refresh()
                    app.bugsViewModel.refresh()
                    navController.navigate("content") { popUpTo("login") { inclusive = true } }
                }
            }
            composable("content") {
                val items by app.contentViewModel.items.collectAsState()
                ContentListScreen(
                    items = items,
                    onDelete = { id -> scope.launch { app.contentViewModel.delete(id) } },
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
                    sessions = sessions,
                    onDelete = { id -> scope.launch { app.scheduleViewModel.delete(id) } },
                    onCreate = { en, ur, at -> scope.launch { app.scheduleViewModel.create(en, ur, at) } },
                )
            }
            composable("live") {
                val session by app.liveViewModel.currentSession.collectAsState()
                LiveScreen(
                    currentSession = session,
                    onStart = { en, ur, url -> scope.launch { app.liveViewModel.start(en, ur, url) } },
                    onEnd = { id -> scope.launch { app.liveViewModel.end(id) } },
                )
            }
            composable("team") {
                val users by app.teamViewModel.users.collectAsState()
                TeamScreen(
                    users = users,
                    onRoleChange = { id, role -> scope.launch { app.teamViewModel.updateRole(id, role) } },
                )
            }
            composable("bugs") {
                val reports by app.bugsViewModel.reports.collectAsState()
                BugsScreen(reports = reports)
            }
        }
    }
}
