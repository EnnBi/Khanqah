package com.khanqah.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.auth.LoginScreen
import com.khanqah.app.ui.home.HomeScreen
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.player.PlayerScreen
import com.khanqah.app.ui.player.PlayerViewModel

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Player : Screen("player/{contentId}") {
        fun route(id: String) = "player/$id"
    }
}

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    playerViewModelFactory: (String) -> PlayerViewModel,
    startDestination: String,
) {
    NavHost(navController = navController, startDestination = startDestination) {
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
        composable(Screen.Player.route) { backStack ->
            val id = backStack.arguments?.getString("contentId") ?: return@composable
            PlayerScreen(viewModel = playerViewModelFactory(id), contentId = id)
        }
    }
}
