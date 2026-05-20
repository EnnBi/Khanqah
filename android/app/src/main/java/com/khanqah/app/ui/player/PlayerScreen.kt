package com.khanqah.app.ui.player

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.PlayerView

@Composable
fun PlayerScreen(viewModel: PlayerViewModel, contentId: String) {
    val content by viewModel.content.collectAsState()

    LaunchedEffect(contentId) { viewModel.load(contentId) }

    content?.let { item ->
        LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
            item {
                if (item.isVideo) {
                    AndroidView(factory = { ctx ->
                        PlayerView(ctx).apply { player = viewModel.player }
                    }, modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f))
                } else {
                    AndroidView(factory = { ctx ->
                        PlayerView(ctx).apply {
                            player = viewModel.player
                            useController = true
                        }
                    }, modifier = Modifier.fillMaxWidth().height(80.dp))
                }
                Spacer(Modifier.height(16.dp))
                Text(item.titleEn, style = MaterialTheme.typography.headlineMedium)
                item.descriptionEn?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.outline)
                }
            }
            item.topics?.let { topics ->
                item {
                    Text("TOPICS", style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
                }
                items(topics) { t ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                        val mins = t.timestampSeconds / 60
                        val secs = t.timestampSeconds % 60
                        Text("%d:%02d".format(mins, secs), style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary, modifier = Modifier.width(56.dp))
                        Text(t.titleEn, style = MaterialTheme.typography.bodyMedium)
                    }
                    HorizontalDivider()
                }
            }
        }
    } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
