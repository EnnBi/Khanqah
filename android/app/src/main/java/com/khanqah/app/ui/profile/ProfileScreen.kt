package com.khanqah.app.ui.profile

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.R
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun ProfileScreen(
    displayName: String,
    phone: String,
    role: String?,
    onLogout: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(R.drawable.khanqah_logo),
            contentDescription = "Khanqah logo",
            modifier = Modifier.size(72.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "خانقاہ مسیح الامۃ",
            fontFamily = NastaleeqFontFamily,
            fontSize = 22.sp,
            color = MaterialTheme.colorScheme.tertiary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))

        if (displayName.isNotBlank()) {
            Text(
                text = displayName,
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
        }
        Text(
            text = phone,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
        )

        role?.let {
            Spacer(Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.tertiaryContainer,
            ) {
                Text(
                    text = it.uppercase(),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }
        }

        Spacer(Modifier.height(40.dp))
        OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
            Text("Sign Out")
        }
    }
}
