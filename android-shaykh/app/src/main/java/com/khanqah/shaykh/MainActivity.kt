package com.khanqah.shaykh

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.fragment.app.FragmentActivity
import com.khanqah.shaykh.ui.navigation.ShaykhNavGraph
import com.khanqah.shaykh.ui.theme.KhanqahShaykhTheme
import kotlinx.coroutines.runBlocking

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as ShaykhApp
        val loggedIn = runBlocking { app.authRepo.isLoggedIn() }
        val name = runBlocking { app.authRepo.getDisplayName() }
        setContent {
            KhanqahShaykhTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    ShaykhNavGraph(app.authViewModel, loggedIn, name)
                }
            }
        }
    }
}
