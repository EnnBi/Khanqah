package com.khanqah.app.ui.live

import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.khanqah.app.data.model.LiveSession

@Composable
fun LiveScreen(session: LiveSession?, context: Context) {
    if (session == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No live session right now.", color = MaterialTheme.colorScheme.outline)
        }
        return
    }

    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(session.streamUrl))
            prepare(); play()
        }
    }
    DisposableEffect(Unit) { onDispose { player.release() } }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
            Text("● LIVE", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
            Spacer(Modifier.width(8.dp))
            Text(session.titleEn, style = MaterialTheme.typography.headlineMedium)
        }
        AndroidView(factory = { ctx ->
            PlayerView(ctx).apply { this.player = player }
        }, modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f))
    }
}
