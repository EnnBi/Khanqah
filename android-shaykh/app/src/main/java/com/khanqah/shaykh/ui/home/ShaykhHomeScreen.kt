package com.khanqah.shaykh.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun ShaykhHomeScreen(displayName: String, onLogout: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("السلام علیکم", style = MaterialTheme.typography.displayMedium, textAlign = TextAlign.Center)
        if (displayName.isNotBlank()) {
            Spacer(Modifier.height(8.dp)); Text(displayName, style = MaterialTheme.typography.titleLarge)
        }
        Spacer(Modifier.height(40.dp))
        Text("سوالات یہاں آئیں گے", style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
        Spacer(Modifier.height(40.dp))
        TextButton(onClick = onLogout) { Text("لاگ آؤٹ") }
    }
}
