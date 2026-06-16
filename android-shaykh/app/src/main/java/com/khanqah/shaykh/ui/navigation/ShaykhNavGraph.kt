package com.khanqah.shaykh.ui.navigation

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.shaykh.ShaykhApp
import com.khanqah.shaykh.ui.auth.AuthViewModel
import com.khanqah.shaykh.ui.auth.LoginScreen

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
            val ctx = androidx.compose.ui.platform.LocalContext.current
            val vm = remember { (ctx.applicationContext as com.khanqah.shaykh.ShaykhApp).makeQueueViewModel() }
            com.khanqah.shaykh.ui.qa.BiometricGate {
                com.khanqah.shaykh.ui.qa.ShaykhFeedScreen(vm = vm, onLogout = {
                    authViewModel.logout()
                    nav.navigate("login") { popUpTo("home") { inclusive = true } }
                })
            }
        }
    }
}
