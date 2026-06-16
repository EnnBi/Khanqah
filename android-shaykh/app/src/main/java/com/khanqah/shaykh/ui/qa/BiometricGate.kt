package com.khanqah.shaykh.ui.qa

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricPrompt.PromptInfo
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

private const val AUTHENTICATORS =
    BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL

@Composable
fun BiometricGate(content: @Composable () -> Unit) {
    val context = LocalContext.current
    var unlocked by remember { mutableStateOf(false) }

    fun prompt() {
        val activity = context as? FragmentActivity ?: run { unlocked = true; return }
        val can = BiometricManager.from(context).canAuthenticate(AUTHENTICATORS)
        if (can != BiometricManager.BIOMETRIC_SUCCESS) { unlocked = true; return }
        val info = PromptInfo.Builder()
            .setTitle("خانقاہ — حضرت")
            .setSubtitle("جاری رکھنے کے لیے اپنی شناخت کی تصدیق کریں")
            .setAllowedAuthenticators(AUTHENTICATORS)
            .build()
        val bp = BiometricPrompt(activity, ContextCompat.getMainExecutor(context),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) { unlocked = true }
            })
        bp.authenticate(info)
    }

    LaunchedEffect(Unit) { if (!unlocked) prompt() }

    if (unlocked) content()
    else Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("🔒", style = MaterialTheme.typography.displayLarge)
        Spacer(Modifier.height(16.dp))
        Text("ایپ مقفل ہے", style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(24.dp))
        Button(onClick = { prompt() }) { Text("کھولیں") }
    }
}
