package com.khanqah.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.HourglassEmpty
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.theme.CrimsonProFontFamily

@Composable
fun ComingSoonScreen(title: String) {
    val gold = MaterialTheme.colorScheme.tertiary
    val bg = MaterialTheme.colorScheme.background
    val card = MaterialTheme.colorScheme.surface

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bg)
            .padding(horizontal = 32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Icon bubble
        Box(
            modifier = Modifier
                .size(88.dp)
                .clip(CircleShape)
                .background(card),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.HourglassEmpty,
                contentDescription = null,
                tint = gold,
                modifier = Modifier.size(40.dp),
            )
        }

        Spacer(Modifier.height(24.dp))

        Text(
            title,
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(8.dp))

        Text(
            "Coming Soon",
            style = MaterialTheme.typography.titleLarge.copy(
                fontFamily = CrimsonProFontFamily,
                fontStyle = FontStyle.Italic,
                fontSize = 22.sp,
            ),
            color = gold,
        )

        Spacer(Modifier.height(12.dp))

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = card,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                "This feature is currently under development and will be available in a future update. We appreciate your patience.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(20.dp),
                lineHeight = 22.sp,
            )
        }
    }
}
