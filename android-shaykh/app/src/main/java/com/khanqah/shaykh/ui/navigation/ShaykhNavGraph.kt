package com.khanqah.shaykh.ui.navigation

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.shaykh.ShaykhApp
import com.khanqah.shaykh.ui.auth.AuthViewModel
import com.khanqah.shaykh.ui.auth.LoginScreen
import com.khanqah.shaykh.ui.home.ShaykhHomeScreen

@Composable
fun ShaykhNavGraph(authViewModel: AuthViewModel, startLoggedIn: Boolean, initialName: String) {
    val nav = rememberNavController()
    val context = LocalContext.current
    val start = if (startLoggedIn) "home" else "login"
    NavHost(nav, startDestination = start) {
        composable("login") {
            LoginScreen(
                viewModel = authViewModel,
                onSuccess = {
                    (context.applicationContext as ShaykhApp).onLoggedIn()
                    nav.navigate("home") { popUpTo("login") { inclusive = true } }
                }
            )
        }
        composable("home") {
            ShaykhHomeScreen(displayName = initialName, onLogout = {
                authViewModel.logout()
                nav.navigate("login") { popUpTo("home") { inclusive = true } }
            })
        }
    }
}
