package com.khanqah.admin.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.R

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSuccess: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    val isOtpStep = state is AuthState.OtpSent

    LaunchedEffect(state) { if (state is AuthState.Success) onSuccess() }

    val gold = Color(0xFFD4A853)
    val darkGreen = Color(0xFF0F2E24)

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Logo — gold background, green calligraphy
        Box(
            modifier = Modifier
                .size(140.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(gold),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(R.drawable.khanqah_logo),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(0.78f),
                contentScale = ContentScale.Fit,
                colorFilter = ColorFilter.tint(darkGreen),
            )
        }

        Spacer(Modifier.height(20.dp))
        Text(
            "Khanqah Admin",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            "Editors, admins & broadcasters only",
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
            color = MaterialTheme.colorScheme.outline,
            modifier = Modifier.padding(bottom = 32.dp),
        )

        OutlinedTextField(value = phone, onValueChange = { phone = it },
            label = { Text("Phone number") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(), enabled = !isOtpStep)

        if (isOtpStep) {
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(value = otp, onValueChange = { if (it.length <= 6) otp = it },
                label = { Text("6-digit code") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth())
        }

        Spacer(Modifier.height(24.dp))

        if (state is AuthState.Error) {
            Text((state as AuthState.Error).message, color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 12.dp))
        }

        Button(
            onClick = { if (isOtpStep) viewModel.verifyOtp(phone, otp) else viewModel.sendOtp(phone) },
            enabled = state !is AuthState.Loading && (if (isOtpStep) otp.length == 6 else phone.isNotBlank()),
            modifier = Modifier.fillMaxWidth().height(50.dp),
        ) {
            if (state is AuthState.Loading)
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary)
            else Text(if (isOtpStep) "Verify" else "Send OTP")
        }
    }
}
