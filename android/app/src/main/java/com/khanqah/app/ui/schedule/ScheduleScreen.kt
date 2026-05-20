package com.khanqah.app.ui.schedule

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.app.data.model.ScheduledSession

@Composable
fun ScheduleScreen(sessions: List<ScheduledSession>) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Text("Schedule", style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(bottom = 16.dp))
        }
        if (sessions.isEmpty()) {
            item { Text("No upcoming sessions.", color = MaterialTheme.colorScheme.outline) }
        }
        items(sessions) { s ->
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text(s.titleEn, style = MaterialTheme.typography.titleLarge)
                    Text(s.scheduledAt, style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline)
                    if (s.isRecurring) {
                        Spacer(Modifier.height(4.dp))
                        Text("Recurring", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}
