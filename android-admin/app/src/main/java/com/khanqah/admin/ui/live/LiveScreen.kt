package com.khanqah.admin.ui.live

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.LiveSession

@Composable
fun LiveScreen(
    currentSession: LiveSession?,
    onStart: (titleEn: String, titleUr: String, streamUrl: String) -> Unit,
    onEnd: (id: String) -> Unit,
) {
    var showDialog by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var streamUrl by remember { mutableStateOf("") }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Start Live Session") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = titleEn, onValueChange = { titleEn = it },
                        label = { Text("Title (English)") })
                    OutlinedTextField(value = titleUr, onValueChange = { titleUr = it },
                        label = { Text("عنوان (اردو)") })
                    OutlinedTextField(value = streamUrl, onValueChange = { streamUrl = it },
                        label = { Text("Stream URL (HLS)") },
                        placeholder = { Text("https://...") })
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (titleEn.isNotBlank() && streamUrl.isNotBlank()) {
                        onStart(titleEn, titleUr, streamUrl)
                        showDialog = false
                    }
                }) { Text("Go Live") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Cancel") } },
        )
    }

    Column(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (currentSession != null) {
            Row(verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 8.dp)) {
                Text("●", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.width(8.dp))
                Text("LIVE: ${currentSession.titleEn}", style = MaterialTheme.typography.headlineMedium)
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { onEnd(currentSession.id) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("End Live Session") }
        } else {
            Text("No live session active", style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(bottom = 24.dp))
            Button(onClick = { showDialog = true }, modifier = Modifier.fillMaxWidth()) {
                Text("Go Live")
            }
        }
    }
}
