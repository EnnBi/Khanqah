package com.khanqah.app.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage

@Composable
fun HomeScreen(viewModel: HomeViewModel, onContentClick: (String) -> Unit) {
    val content by viewModel.content.collectAsState(emptyList())
    val live by viewModel.live.collectAsState()
    val schedule by viewModel.schedule.collectAsState()

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        live?.let { session ->
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp).clickable { onContentClick("live") }
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("● LIVE", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
                        Spacer(Modifier.width(8.dp))
                        Text(session.titleEn, style = MaterialTheme.typography.titleLarge)
                    }
                }
            }
        }

        if (schedule.isNotEmpty()) {
            item {
                Text("NEXT SESSION", style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(bottom = 8.dp))
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(schedule[0].titleEn, style = MaterialTheme.typography.titleLarge)
                        Text(schedule[0].scheduledAt, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline)
                    }
                }
            }
        }

        item {
            Text("RECENT", style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(bottom = 8.dp))
        }

        items(content) { item ->
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clickable { onContentClick(item.id) }) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    item.thumbnailUrl?.let {
                        AsyncImage(model = it, contentDescription = null, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.width(12.dp))
                    }
                    Column {
                        Text(item.titleEn, style = MaterialTheme.typography.titleLarge)
                        Text(item.type, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline)
                    }
                }
            }
        }
    }
}
