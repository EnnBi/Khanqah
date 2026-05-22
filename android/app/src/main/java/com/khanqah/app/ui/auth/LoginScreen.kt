package com.khanqah.app.ui.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.R
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSuccess: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var mode by remember { mutableIntStateOf(0) } // 0 = Sign In, 1 = Register
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    val isOtpStep = state is AuthState.OtpSent

    LaunchedEffect(state) {
        if (state is AuthState.Success) onSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))

        // Brand
        Image(
            painter = painterResource(R.drawable.khanqah_logo),
            contentDescription = null,
            modifier = Modifier.size(90.dp),
        )
        Spacer(Modifier.height(14.dp))
        Text(
            "Khanqah Maseeh-ul-Ummah",
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-0.01).sp,
            ),
            textAlign = TextAlign.Center,
        )
        Text(
            "خانقاہ مسیح الامۃ",
            fontFamily = NastaleeqFontFamily,
            fontSize = 22.sp,
            color = MaterialTheme.colorScheme.tertiary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp),
        )
        Spacer(Modifier.height(32.dp))

        // Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Column {
                // Decorative gradient top bar
                Box(
                    modifier = Modifier.fillMaxWidth().height(3.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.tertiary,
                                )
                            )
                        )
                )

                Column(Modifier.padding(20.dp)) {
                    if (!isOtpStep) {
                        // Mode toggle
                        ModeToggle(
                            mode = mode,
                            onSignIn = { mode = 0; name = ""; viewModel.reset() },
                            onRegister = { mode = 1; viewModel.reset() },
                        )
                        Spacer(Modifier.height(20.dp))

                        if (mode == 1) {
                            FieldLabel("Your Name")
                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it },
                                placeholder = { Text("Your name") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                            )
                            Spacer(Modifier.height(14.dp))
                        }

                        FieldLabel("Phone Number")
                        PhoneInputField(
                            value = phone,
                            onValueChange = { phone = it },
                        )
                    } else {
                        Text(
                            "Enter code",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Medium),
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            buildString {
                                append("6-digit code sent to ")
                                append(phone)
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.padding(bottom = 16.dp),
                        )
                        OutlinedTextField(
                            value = otp,
                            onValueChange = { if (it.length <= 6) otp = it.filter(Char::isDigit) },
                            placeholder = { Text("000000", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            textStyle = LocalTextStyle.current.copy(
                                fontSize = 26.sp,
                                textAlign = TextAlign.Center,
                                letterSpacing = 10.sp,
                                fontFamily = FontFamily.Monospace,
                            ),
                        )
                    }

                    if (state is AuthState.Error) {
                        Spacer(Modifier.height(10.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
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

                    Spacer(Modifier.height(16.dp))

                    val canSend = phone.isNotBlank() && (mode == 0 || name.isNotBlank())
                    Button(
                        onClick = {
                            if (isOtpStep) viewModel.verifyOtp(phone, otp, if (mode == 1) name else "")
                            else viewModel.sendOtp(phone)
                        },
                        enabled = state !is AuthState.Loading &&
                            if (isOtpStep) otp.length == 6 else canSend,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.tertiary,
                        ),
                    ) {
                        if (state is AuthState.Loading)
                            CircularProgressIndicator(
                                Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                        else
                            Text(
                                if (isOtpStep) "Verify" else "Send OTP",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                            )
                    }

                    if (isOtpStep) {
                        TextButton(
                            onClick = { viewModel.reset(); otp = "" },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                "← Use a different number",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(40.dp))
    }
}

@Composable
private fun ModeToggle(mode: Int, onSignIn: () -> Unit, onRegister: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.background,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(Modifier.padding(3.dp)) {
            listOf(0 to "Sign in", 1 to "Register").forEach { (idx, label) ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(6.dp))
                        .background(
                            if (mode == idx) MaterialTheme.colorScheme.primary
                            else Color.Transparent
                        )
                        .clickable { if (idx == 0) onSignIn() else onRegister() }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        color = if (mode == idx) MaterialTheme.colorScheme.tertiary
                                else MaterialTheme.colorScheme.secondary,
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                    )
                }
            }
        }
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall.copy(
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.06.sp,
        ),
        color = MaterialTheme.colorScheme.secondary,
        modifier = Modifier.padding(bottom = 6.dp),
    )
}
