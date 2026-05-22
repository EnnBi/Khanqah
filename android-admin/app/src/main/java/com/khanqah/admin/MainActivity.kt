package com.khanqah.admin

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.khanqah.admin.ui.navigation.AdminNavGraph
import com.khanqah.admin.ui.theme.KhanqahTheme
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as AdminApp
        val startDest = if (runBlocking { app.authRepo.isLoggedIn() }) "live" else "login"

        setContent {
            KhanqahTheme {
                AdminNavGraph(app = app, startDestination = startDest)
            }
        }
    }
}
