package com.khanqah.app.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.khanqah.app.data.model.Topic
import com.khanqah.app.ui.components.TypeIconSquare
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu
import kotlinx.coroutines.delay

private fun detectIsVideo(isVideoFlag: Boolean, type: String, url: String): Boolean {
    if (isVideoFlag) return true
    if (type.lowercase() in setOf("clip", "video", "reel", "short")) return true
    val u = url.lowercase()
    return u.contains(".mp4") || u.contains(".m3u8") || u.contains(".mov") ||
           u.contains(".webm") || u.contains("video/") || u.contains("/videos/")
}

private fun detectIsBook(type: String, url: String): Boolean {
    if (type.lowercase() in setOf("book", "books")) return true
    return url.lowercase().endsWith(".pdf")
}

@Composable
fun PlayerScreen(
    viewModel: PlayerViewModel,
    contentId: String,
    onBack: () -> Unit = {},
) {
    val content by viewModel.content.collectAsState()

    LaunchedEffect(contentId) { viewModel.load(contentId) }

    val isUrdu = LocalIsUrdu.current
    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        content?.let { item ->
            val isBook  = detectIsBook(item.type, item.mediaUrl)
            val isVideo = !isBook && detectIsVideo(item.isVideo, item.type, item.mediaUrl)
            val title = if (isUrdu && item.titleUr.isNotBlank()) item.titleUr else item.titleEn

            when {
                isBook -> PdfViewerScreen(
                    url = item.mediaUrl,
                    title = title,
                    type = item.type,
                    onBack = onBack,
                )
                isVideo -> VideoPlayerScreen(
                    player = viewModel.player,
                    title = title,
                    type = item.type,
                    description = item.descriptionEn,
                    topics = item.topics,
                    onBack = onBack,
                    onSeekTo = { viewModel.player.seekTo(it) },
                )
                else -> AudioFullScreen(
                    player = viewModel.player,
                    title = title,
                    type = item.type,
                    onBack = onBack,
                )
            }
        } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.tertiary)
        }
    }
}

// ─────────────────────────────────────────────────────────────
// VIDEO: fills available height, title + back overlaid, topics below
// ─────────────────────────────────────────────────────────────

@Composable
private fun VideoPlayerScreen(
    player: ExoPlayer,
    title: String,
    type: String,
    description: String?,
    topics: List<Topic>?,
    onBack: () -> Unit,
    onSeekTo: (Long) -> Unit,
) {
    val gold = MaterialTheme.colorScheme.tertiary
    val hasExtra = !description.isNullOrBlank() || !topics.isNullOrEmpty()
    var isBuffering by remember { mutableStateOf(true) }

    LaunchedEffect(player) {
        while (true) {
            isBuffering = player.playbackState == Player.STATE_BUFFERING ||
                          player.playbackState == Player.STATE_IDLE
            delay(300)
        }
    }

    Column(Modifier.fillMaxSize().background(Color.Black)) {
        // ── Video fills all space; if there is metadata below it gets ~220dp ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (hasExtra) Modifier.weight(1f) else Modifier.fillMaxHeight()),
        ) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        this.player = player
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShowNextButton(false)
                        setShowPreviousButton(false)
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )

            // Buffering overlay
            if (isBuffering) {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.4f)),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = gold, strokeWidth = 3.dp, modifier = Modifier.size(48.dp))
                }
            }

            // Top bar: back button + title
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopStart)
                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.6f), Color.Transparent)))
                    .padding(horizontal = 10.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.4f))
                        .clickable(onClick = onBack),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        type.uppercase(),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.08.sp),
                        color = gold,
                    )
                    Text(
                        title,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        // ── Metadata section (only when content exists) ──
        if (hasExtra) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .background(MaterialTheme.colorScheme.background),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            ) {
                item {
                    description?.let { desc ->
                        if (desc.isNotBlank()) {
                            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                                Text(desc, style = MaterialTheme.typography.bodySmall.copy(lineHeight = 20.sp, fontFamily = CrimsonProFontFamily, fontStyle = FontStyle.Italic, fontSize = 13.sp), color = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(12.dp))
                            }
                            Spacer(Modifier.height(10.dp))
                        }
                    }
                    topics?.takeIf { it.isNotEmpty() }?.let {
                        Text("TOPICS  ·  ${it.size}", style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.1.sp), color = gold, modifier = Modifier.padding(bottom = 6.dp))
                    }
                }
                items(topics ?: emptyList()) { t ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onSeekTo(t.timestampSeconds * 1000L) }.padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(shape = RoundedCornerShape(6.dp), color = gold.copy(alpha = 0.12f)) {
                            Text("%d:%02d".format(t.timestampSeconds / 60, t.timestampSeconds % 60), style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold, fontSize = 10.sp), color = gold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(t.titleEn, style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp), color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f), thickness = 0.5.dp)
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// AUDIO: full screen — artwork centred, controls pinned bottom
// ─────────────────────────────────────────────────────────────

@Composable
private fun AudioFullScreen(
    player: ExoPlayer,
    title: String,
    type: String,
    onBack: () -> Unit,
) {
    var positionMs  by remember { mutableLongStateOf(0L) }
    var durationMs  by remember { mutableLongStateOf(0L) }
    var isPlaying   by remember { mutableStateOf(false) }
    var isBuffering by remember { mutableStateOf(true) }

    LaunchedEffect(player) {
        while (true) {
            positionMs  = player.currentPosition
            durationMs  = player.duration.coerceAtLeast(0L)
            isPlaying   = player.isPlaying
            isBuffering = player.playbackState == Player.STATE_BUFFERING ||
                          player.playbackState == Player.STATE_IDLE
            delay(500)
        }
    }

    val progress = if (durationMs > 0L) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f
    val gold     = MaterialTheme.colorScheme.tertiary
    val heroBg   = MaterialTheme.colorScheme.primary

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(listOf(heroBg, heroBg, MaterialTheme.colorScheme.background))
            )
            .drawBehind {
                val cx = size.width + 20f
                for (r in listOf(120f, 200f, 290f, 390f)) {
                    drawCircle(Color(0xFFD4AF37).copy(alpha = 0.06f), r, Offset(cx, 0f), style = Stroke(1f))
                }
            },
    ) {
        // ── Top bar ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.08f)).clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("NOW PLAYING", style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp, letterSpacing = 0.14.sp), color = gold.copy(alpha = 0.55f))
                Text(type.uppercase(), style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp, fontWeight = FontWeight.Medium), color = gold.copy(alpha = 0.8f))
            }
        }

        // ── Centre: artwork + title ──
        Column(
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 36.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TypeIconSquare(type = type, size = 164.dp)
            Spacer(Modifier.height(32.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold, lineHeight = 30.sp),
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                type.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp),
                color = gold.copy(alpha = 0.65f),
            )
        }

        // ── Bottom: seek + controls ──
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 28.dp).padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Slider(
                value = progress,
                onValueChange = { player.seekTo((it * durationMs).toLong()) },
                modifier = Modifier.fillMaxWidth(),
                colors = SliderDefaults.colors(
                    thumbColor = gold,
                    activeTrackColor = gold,
                    inactiveTrackColor = gold.copy(alpha = 0.2f),
                ),
            )
            Row(Modifier.fillMaxWidth()) {
                Text(formatMs(positionMs), style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp), color = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.weight(1f))
                Text(formatMs(durationMs), style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp), color = MaterialTheme.colorScheme.secondary)
            }
            Spacer(Modifier.height(20.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { player.seekTo((player.currentPosition - 10_000L).coerceAtLeast(0L)) }, modifier = Modifier.size(54.dp)) {
                    Icon(Icons.Filled.Replay10, null, tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(30.dp))
                }
                Spacer(Modifier.width(24.dp))
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(gold)
                        .clickable(enabled = !isBuffering) { if (isPlaying) player.pause() else player.play() },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isBuffering) {
                        CircularProgressIndicator(
                            color = Color(0xFF0B2F27),
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(34.dp),
                        )
                    } else {
                        Icon(
                            if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            null, tint = Color(0xFF0B2F27), modifier = Modifier.size(38.dp),
                        )
                    }
                }
                Spacer(Modifier.width(24.dp))
                IconButton(onClick = { player.seekTo(player.currentPosition + 10_000L) }, modifier = Modifier.size(54.dp)) {
                    Icon(Icons.Filled.Forward10, null, tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(30.dp))
                }
            }
        }
    }
}

private fun formatMs(ms: Long): String {
    val s = ms / 1000
    val h = s / 3600; val m = (s % 3600) / 60; val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%d:%02d".format(m, sec)
}
