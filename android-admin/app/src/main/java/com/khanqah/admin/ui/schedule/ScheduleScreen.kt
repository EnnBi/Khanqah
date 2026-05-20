package com.khanqah.admin.ui.schedule

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.ScheduledSession

@Composable
fun ScheduleScreen(
    sessions: List<ScheduledSession>,
    onDelete: (String) -> Unit,
    onCreate: (titleEn: String, titleUr: String, scheduledAt: String) -> Unit,
) {
    var showDialog by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var scheduledAt by remember { mutableStateOf("") }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("New Session") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = titleEn, onValueChange = { titleEn = it },
                        label = { Text("Title (English)") })
                    OutlinedTextField(value = titleUr, onValueChange = { titleUr = it },
                        label = { Text("عنوان (اردو)") })
                    OutlinedTextField(value = scheduledAt, onValueChange = { scheduledAt = it },
                        label = { Text("Date/Time (ISO 8601)") },
                        placeholder = { Text("2026-06-01T18:00:00Z") })
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (titleEn.isNotBlank() && scheduledAt.isNotBlank()) {
                        onCreate(titleEn, titleUr, scheduledAt)
                        showDialog = false
                    }
                }) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Cancel") } },
        )
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { showDialog = true }) { Text("+") }
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            item {
                Text("Schedule", style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 16.dp))
            }
            if (sessions.isEmpty()) {
                item { Text("No upcoming sessions.", color = MaterialTheme.colorScheme.outline) }
            }
            items(sessions) { s ->
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(Modifier.padding(16.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(s.titleEn, style = MaterialTheme.typography.titleLarge)
                            Text(s.scheduledAt, style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline)
                        }
                        TextButton(onClick = { onDelete(s.id) }) {
                            Text("Delete", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}
