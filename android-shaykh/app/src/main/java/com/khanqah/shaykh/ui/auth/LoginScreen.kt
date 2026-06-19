package com.khanqah.shaykh.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.shaykh.R

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSuccess: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var phone     by remember { mutableStateOf("") }
    var otp       by remember { mutableStateOf("") }
    var isOtpStep by remember { mutableStateOf(false) }

    LaunchedEffect(state) {
        when (state) {
            is AuthState.OtpSent -> isOtpStep = true
            is AuthState.Success -> onSuccess()
            is AuthState.Idle    -> isOtpStep = false
            else -> {} // Error / Loading — stay on current step
        }
    }

    val gold  = MaterialTheme.colorScheme.primary
    val bg    = MaterialTheme.colorScheme.background
    val onBg  = MaterialTheme.colorScheme.onBackground

    // Login is English/LTR even though the rest of the shaykh app is Urdu/RTL.
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(48.dp))

        // Logo
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(gold),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(R.drawable.khanqah_logo),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(0.68f),
                contentScale = ContentScale.Fit,
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.background),
            )
        }

        Spacer(Modifier.height(20.dp))

        Text(
            "Khanqah Hazrat",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontFamily = FontFamily.Serif,
                fontSize = 30.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = onBg,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Listen and answer privately",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.secondary,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(40.dp))

        if (!isOtpStep) {
            PhoneInputField(
                value = phone,
                onValueChange = { phone = it },
                enabled = true,
            )
        } else {
            Text(
                "Enter the 6-digit code",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = onBg,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Sent to $phone",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.padding(bottom = 16.dp),
            )
            OutlinedTextField(
                value = otp,
                onValueChange = { if (it.length <= 6) otp = it.filter(Char::isDigit) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.bodyLarge.copy(
                    fontSize = 28.sp,
                    textAlign = TextAlign.Center,
                    letterSpacing = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    color = gold,
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = gold,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                ),
            )
        }

        if (state is AuthState.Error) {
            Spacer(Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.errorContainer,
            ) {
                Text(
                    (state as AuthState.Error).message,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        Spacer(Modifier.height(20.dp))

        Button(
            onClick = {
                if (isOtpStep) viewModel.verifyOtp(phone, otp)
                else viewModel.sendOtp(phone)
            },
            enabled = state !is AuthState.Loading &&
                if (isOtpStep) otp.length == 6 else phone.isNotBlank(),
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = gold,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                disabledContainerColor = gold.copy(alpha = 0.3f),
                disabledContentColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f),
            ),
        ) {
            if (state is AuthState.Loading)
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            else
                Text(
                    if (isOtpStep) "Verify" else "Send code",
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                )
        }

        if (isOtpStep) {
            TextButton(
                onClick = { viewModel.reset(); otp = ""; isOtpStep = false },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    "← Use a different number",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        }

        Spacer(Modifier.height(48.dp))
    }
    }
}
