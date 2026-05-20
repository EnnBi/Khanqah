package com.khanqah.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khanqah.app.data.model.LiveSession
import com.khanqah.app.data.model.ScheduledSession
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.auth.LoginScreen
import com.khanqah.app.ui.home.HomeScreen
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.live.LiveScreen
import com.khanqah.app.ui.player.PlayerScreen
import com.khanqah.app.ui.player.PlayerViewModel
import com.khanqah.app.ui.profile.ProfileScreen
import com.khanqah.app.ui.schedule.ScheduleScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Library : Screen("library")
    object Schedule : Screen("schedule")
    object Live : Screen("live")
    object Profile : Screen("profile")
    object Player : Screen("player/{contentId}") {
        fun route(id: String) = "player/$id"
    }
}

data class BottomNavItem(val screen: Screen, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home, "Home", Icons.Default.Home),
    BottomNavItem(Screen.Library, "Library", Icons.Default.LibraryMusic),
    BottomNavItem(Screen.Schedule, "Schedule", Icons.Default.DateRange),
    BottomNavItem(Screen.Live, "Live", Icons.Default.PlayCircle),
    BottomNavItem(Screen.Profile, "Profile", Icons.Default.Person),
)

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    playerViewModelFactory: (String) -> PlayerViewModel,
    liveSession: LiveSession?,
    scheduleList: List<ScheduledSession>,
    userRole: String?,
    startDestination: String,
    onLogout: () -> Unit,
) {
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    val showBottomNav = currentRoute != Screen.Login.route && currentRoute != Screen.Player.route

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        NavigationBarItem(
                            selected = currentRoute == item.screen.route,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
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
            modifier = androidx.compose.ui.Modifier.padding(padding),
        ) {
            composable(Screen.Login.route) {
                LoginScreen(viewModel = authViewModel) {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            }
            composable(Screen.Home.route) {
                HomeScreen(viewModel = homeViewModel) { id ->
                    navController.navigate(Screen.Player.route(id))
                }
            }
            composable(Screen.Library.route) {
                // placeholder — full Library screen in future iteration
                androidx.compose.foundation.layout.Box(
                    modifier = androidx.compose.ui.Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center,
                ) { Text("Library — coming soon") }
            }
            composable(Screen.Schedule.route) {
                ScheduleScreen(sessions = scheduleList)
            }
            composable(Screen.Live.route) {
                val context = LocalContext.current
                LiveScreen(session = liveSession, context = context)
            }
            composable(Screen.Profile.route) {
                ProfileScreen(role = userRole, onLogout = onLogout)
            }
            composable(Screen.Player.route) { backStack ->
                val id = backStack.arguments?.getString("contentId") ?: return@composable
                PlayerScreen(viewModel = playerViewModelFactory(id), contentId = id)
            }
        }
    }
}
