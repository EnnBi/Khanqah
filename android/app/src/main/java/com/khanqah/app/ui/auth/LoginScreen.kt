package com.khanqah.app.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
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
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(R.drawable.khanqah_logo),
            contentDescription = "Khanqah logo",
            modifier = Modifier.size(80.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = "Khanqah Maseeh-ul-Ummah",
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Text(
            text = "خانقاہ مسیح الامۃ",
            fontFamily = NastaleeqFontFamily,
            fontSize = 20.sp,
            color = MaterialTheme.colorScheme.tertiary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(32.dp))

        Surface(
            shape = RoundedCornerShape(16.dp),
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {

                if (!isOtpStep) {
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        SegmentedButton(
                            selected = mode == 0,
                            onClick = { mode = 0; name = ""; viewModel.reset() },
                            shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                            label = { Text("Sign In") },
                        )
                        SegmentedButton(
                            selected = mode == 1,
                            onClick = { mode = 1; viewModel.reset() },
                            shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                            label = { Text("Register") },
                        )
                    }
                    Spacer(Modifier.height(20.dp))

                    if (mode == 1) {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Your Name") },
                            placeholder = { Text("Your name") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number") },
                        placeholder = { Text("+91 98765 43210") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                } else {
                    Text(
                        text = "Enter the 6-digit code sent to $phone",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        modifier = Modifier.padding(bottom = 16.dp),
                    )
                    OutlinedTextField(
                        value = otp,
                        onValueChange = { if (it.length <= 6) otp = it.filter(Char::isDigit) },
                        label = { Text("6-digit code") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }

                Spacer(Modifier.height(16.dp))

                if (state is AuthState.Error) {
                    Text(
                        text = (state as AuthState.Error).message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }

                val canSend = phone.isNotBlank() && (mode == 0 || name.isNotBlank())
                Button(
                    onClick = {
                        if (isOtpStep) viewModel.verifyOtp(phone, otp, if (mode == 1) name else "")
                        else viewModel.sendOtp(phone)
                    },
                    enabled = state !is AuthState.Loading &&
                        if (isOtpStep) otp.length == 6 else canSend,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                ) {
                    if (state is AuthState.Loading)
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    else
                        Text(if (isOtpStep) "Verify" else "Send OTP")
                }

                if (isOtpStep) {
                    TextButton(
                        onClick = { viewModel.reset(); otp = "" },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("← Use a different number", style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
    }
}
