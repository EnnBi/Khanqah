package com.khanqah.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
import com.khanqah.app.ui.library.CategoryDetailScreen
import com.khanqah.app.ui.library.CategoryDetailViewModel
import com.khanqah.app.ui.library.LibraryScreen
import com.khanqah.app.ui.library.LibraryViewModel
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
    object CategoryDetail : Screen("category/{categoryId}/{nameEn}/{nameUr}") {
        fun route(id: String, nameEn: String, nameUr: String) =
            "category/$id/${nameEn.encodeUrl()}/${nameUr.encodeUrl()}"
    }
}

private fun String.encodeUrl() = java.net.URLEncoder.encode(this, "UTF-8")
private fun String.decodeUrl() = java.net.URLDecoder.decode(this, "UTF-8")

data class BottomNavItem(val screen: Screen, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home,     "Home",     Icons.Default.Home),
    BottomNavItem(Screen.Library,  "Library",  Icons.AutoMirrored.Filled.List),
    BottomNavItem(Screen.Schedule, "Schedule", Icons.Default.DateRange),
    BottomNavItem(Screen.Live,     "Live",     Icons.Default.PlayArrow),
    BottomNavItem(Screen.Profile,  "Profile",  Icons.Default.Person),
)

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    libraryViewModel: LibraryViewModel,
    playerViewModelFactory: (String) -> PlayerViewModel,
    categoryDetailViewModelFactory: (String) -> CategoryDetailViewModel,
    liveSession: LiveSession?,
    scheduleList: List<ScheduledSession>,
    displayName: String,
    phone: String,
    userRole: String?,
    startDestination: String,
    onLogout: () -> Unit,
) {
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    val noBottomNavRoutes = setOf(Screen.Login.route, Screen.Player.route, Screen.CategoryDetail.route)
    val showBottomNav = currentRoute !in noBottomNavRoutes

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
            modifier = Modifier.padding(padding),
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
                LibraryScreen(viewModel = libraryViewModel) { cat ->
                    navController.navigate(Screen.CategoryDetail.route(cat.id, cat.nameEn, cat.nameUr))
                }
            }
            composable(Screen.CategoryDetail.route) { backStack ->
                val categoryId = backStack.arguments?.getString("categoryId") ?: return@composable
                val nameEn = backStack.arguments?.getString("nameEn")?.decodeUrl() ?: ""
                val nameUr = backStack.arguments?.getString("nameUr")?.decodeUrl() ?: ""
                CategoryDetailScreen(
                    viewModel = categoryDetailViewModelFactory(categoryId),
                    categoryNameEn = nameEn,
                    categoryNameUr = nameUr,
                    onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.Schedule.route) {
                ScheduleScreen(sessions = scheduleList)
            }
            composable(Screen.Live.route) {
                val context = LocalContext.current
                LiveScreen(session = liveSession, context = context)
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    displayName = displayName,
                    phone = phone,
                    role = userRole,
                    onLogout = onLogout,
                )
            }
            composable(Screen.Player.route) { backStack ->
                val id = backStack.arguments?.getString("contentId") ?: return@composable
                PlayerScreen(viewModel = playerViewModelFactory(id), contentId = id)
            }
        }
    }
}
