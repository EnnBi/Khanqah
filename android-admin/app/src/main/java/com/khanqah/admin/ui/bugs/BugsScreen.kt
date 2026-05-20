package com.khanqah.admin.ui.bugs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.BugReport

@Composable
fun BugsScreen(reports: List<BugReport>) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Text("Bug Reports", style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 16.dp))
        }
        if (reports.isEmpty()) {
            item { Text("No bug reports.", color = MaterialTheme.colorScheme.outline) }
        }
        items(reports) { r ->
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SuggestionChip(onClick = {}, label = { Text(r.status) })
                        SuggestionChip(onClick = {}, label = { Text(r.platform) })
                        SuggestionChip(onClick = {}, label = { Text("v${r.appVersion}") })
                    }
                    r.note?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, style = MaterialTheme.typography.bodyLarge)
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(r.timestamp, style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }
}
