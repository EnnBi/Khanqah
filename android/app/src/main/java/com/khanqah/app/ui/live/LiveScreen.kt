package com.khanqah.app.ui.live

import android.content.Context
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.khanqah.app.data.model.LiveSession
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import java.time.Instant
import java.time.ZoneId

// ── Live player colour tokens ─────────────────────────────────────────────────
private val LiveBg        = Color(0xFF022F2B)
private val LiveSurface   = Color(0xFF0B4A43)
private val LiveGold      = Color(0xFFD4B26A)
private val LiveGoldMuted = Color(0xFFA89674)
private val LiveCoral     = Color(0xFFE36B68)
private val LiveCoralDeep = Color(0xFFD95F5B)
private val LiveCream     = Color(0xFFF4EFE7)
private val LiveDivider   = Color(0x14FFFFFF)

@Composable
fun LiveScreen(
    session: LiveSession?,
    player: ExoPlayer?,
    context: Context,
    onExitLive: () -> Unit = {},
    pingLive: suspend () -> Int = { 0 },
    leaveLive: suspend () -> Unit = {},
    checkLive: suspend () -> Boolean = { true },
) {
    // Must be before any early return so state survives session→null transitions
    var hadSession by remember { mutableStateOf(session != null) }
    var sessionEnded by remember { mutableStateOf(false) }
    var isPlaying by remember { mutableStateOf(player?.isPlaying ?: true) }
    var elapsedSeconds by remember { mutableIntStateOf(
        if (session != null) computeInitialElapsed(session.startedAt) else 0
    ) }
    var listenerCount by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    // Detect session ending via HomeViewModel's null-out path
    LaunchedEffect(session) {
        if (session != null) hadSession = true
        if (session == null && hadSession) {
            sessionEnded = true
            player?.pause()
        }
    }

    // Sync isPlaying; detect stream end via state transitions
    LaunchedEffect(player) {
        var wasPlaying = false
        while (true) {
            val playing = player?.isPlaying ?: false
            val state   = player?.playbackState ?: Player.STATE_IDLE
            isPlaying = playing

            when {
                state == Player.STATE_ENDED -> {
                    sessionEnded = true; break
                }
                // was playing, now stopped and not paused by user (STATE_READY = user pause)
                wasPlaying && !playing && state != Player.STATE_READY -> {
                    // Wait up to 8s for stream to recover before declaring ended
                    delay(8_000)
                    if (!(player?.isPlaying ?: false) && !sessionEnded) {
                        sessionEnded = true; break
                    }
                }
            }
            wasPlaying = playing && state == Player.STATE_READY
            delay(500)
        }
    }

    // Elapsed timer — stops when session ends
    LaunchedEffect(session?.id) {
        if (session == null) return@LaunchedEffect
        while (!sessionEnded) {
            delay(1000)
            elapsedSeconds++
        }
    }

    // Poll every 15s: check if session is still live, update listener count
    LaunchedEffect(session?.id) {
        if (session == null) return@LaunchedEffect
        while (true) {
            delay(15_000)
            val isLive = checkLive()
            if (!isLive) {
                sessionEnded = true
                player?.pause()
                leaveLive()
                break
            }
            listenerCount = pingLive()
        }
    }

    // Route to the right screen after all state is set up
    if (sessionEnded || (session == null && hadSession)) {
        BroadcastEndedScreen(onBack = onExitLive)
        return
    }
    if (session == null) {
        NoLiveScreen()
        return
    }

    val timerText = if (elapsedSeconds < 3600)
        "%02d:%02d".format(elapsedSeconds / 60, elapsedSeconds % 60)
    else
        "%02d:%02d:%02d".format(elapsedSeconds / 3600, (elapsedSeconds % 3600) / 60, elapsedSeconds % 60)

    val startedLabel = formatStartTime(session.startedAt)

    val infiniteTransition = rememberInfiniteTransition(label = "liveDot")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 0.15f,
        animationSpec = infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "dot",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LiveBg),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(52.dp))

            // ── Header ───────────────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.clickable {
                        scope.launch { leaveLive() }
                        onExitLive()
                    },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = LiveCream,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        "Back",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontStyle = FontStyle.Italic,
                            fontFamily = FontFamily.Serif,
                        ),
                        color = LiveCream.copy(alpha = 0.75f),
                    )
                }

                // LIVE pill
                Surface(
                    shape = RoundedCornerShape(50.dp),
                    color = LiveCoral,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(6.dp)
                                .alpha(dotAlpha)
                                .background(Color.White, CircleShape),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "LIVE  •  $listenerCount ${if (listenerCount == 1) "LISTENING" else "LISTENING"}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.08.sp,
                            ),
                            color = Color.White,
                        )
                    }
                }

                Icon(
                    Icons.Outlined.MoreVert,
                    contentDescription = "Menu",
                    tint = LiveCream.copy(alpha = 0.6f),
                    modifier = Modifier.size(22.dp),
                )
            }

            Spacer(Modifier.height(36.dp))

            // ── Cover art ────────────────────────────────────────────────────
            CoverArtCard()

            Spacer(Modifier.height(20.dp))

            AudioWaveAnimation(isPlaying = isPlaying)

            Spacer(Modifier.height(16.dp))

            // ── Title ────────────────────────────────────────────────────────
            Text(
                session.titleEn,
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Serif,
                    letterSpacing = (-0.5).sp,
                    lineHeight = 38.sp,
                ),
                color = LiveCream,
                textAlign = TextAlign.Center,
            )

            if (session.titleUr.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    session.titleUr,
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontStyle = FontStyle.Italic,
                        fontFamily = FontFamily.Serif,
                    ),
                    color = LiveGold.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center,
                )
            }

            Spacer(Modifier.height(6.dp))
            Text(
                "HAZRAT MUFTI ABDUR RASHEED MIFTAHI SAHAB",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 9.sp,
                    letterSpacing = 0.22.sp,
                    fontWeight = FontWeight.Medium,
                ),
                color = LiveGoldMuted,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(28.dp))

            // ── Timer with coral side lines ───────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(1.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(Color.Transparent, LiveCoral.copy(alpha = 0.55f)),
                            ),
                        ),
                )
                Spacer(Modifier.width(14.dp))
                Text(
                    timerText,
                    style = MaterialTheme.typography.displaySmall.copy(
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Serif,
                        letterSpacing = 3.sp,
                    ),
                    color = LiveGold,
                )
                Spacer(Modifier.width(14.dp))
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(1.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(LiveCoral.copy(alpha = 0.55f), Color.Transparent),
                            ),
                        ),
                )
            }

            Spacer(Modifier.height(6.dp))
            Text(
                "$listenerCount ${if (listenerCount == 1) "LISTENER" else "LISTENERS"}",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 9.sp,
                    letterSpacing = 0.18.sp,
                ),
                color = LiveGoldMuted,
            )

            Spacer(Modifier.height(32.dp))

            // ── Controls ─────────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Volume
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.width(72.dp),
                ) {
                    Icon(
                        Icons.Outlined.VolumeUp,
                        contentDescription = "Volume",
                        tint = LiveCream.copy(alpha = 0.55f),
                        modifier = Modifier.size(24.dp),
                    )
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "VOLUME",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 8.sp,
                            letterSpacing = 0.14.sp,
                        ),
                        color = LiveGoldMuted,
                    )
                }

                // Play/Pause — large glowing coral circle
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .shadow(
                            elevation = 24.dp,
                            shape = CircleShape,
                            ambientColor = LiveCoral.copy(alpha = 0.55f),
                            spotColor = LiveCoral.copy(alpha = 0.65f),
                        )
                        .clip(CircleShape)
                        .background(Brush.radialGradient(listOf(LiveCoral, LiveCoralDeep)))
                        .clickable {
                            if (isPlaying) player?.pause() else player?.play()
                            isPlaying = !isPlaying
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isPlaying) {
                        // Pause icon
                        Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                            Box(Modifier.width(4.dp).height(20.dp).clip(RoundedCornerShape(2.dp)).background(Color.White))
                            Box(Modifier.width(4.dp).height(20.dp).clip(RoundedCornerShape(2.dp)).background(Color.White))
                        }
                    } else {
                        // Play triangle
                        Canvas(Modifier.size(22.dp)) {
                            val path = androidx.compose.ui.graphics.Path().apply {
                                moveTo(size.width * 0.2f, 0f)
                                lineTo(size.width, size.height / 2f)
                                lineTo(size.width * 0.2f, size.height)
                                close()
                            }
                            drawPath(path, Color.White)
                        }
                    }
                }

                // Share
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.width(72.dp),
                ) {
                    Icon(
                        Icons.Outlined.Share,
                        contentDescription = "Share",
                        tint = LiveCream.copy(alpha = 0.55f),
                        modifier = Modifier.size(24.dp),
                    )
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "SHARE",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 8.sp,
                            letterSpacing = 0.14.sp,
                        ),
                        color = LiveGoldMuted,
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            HorizontalDivider(color = LiveDivider, thickness = 0.5.dp)

            Spacer(Modifier.height(18.dp))

            Text(
                session.titleEn,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                ),
                color = LiveCream.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                if (startedLabel.isNotBlank()) "STARTED AT $startedLabel" else "LIVE NOW",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 9.sp,
                    letterSpacing = 0.16.sp,
                ),
                color = LiveGoldMuted,
            )
        }
    }
}

// ── Audio wave animation ──────────────────────────────────────────────────────

@Composable
private fun AudioWaveAnimation(isPlaying: Boolean) {
    val barCount = 7
    val transition = rememberInfiniteTransition(label = "wave")

    // Each bar gets its own animated height fraction with staggered speed + offset
    val heights = List(barCount) { i ->
        val duration = 380 + i * 55
        val offset   = i * 70
        transition.animateFloat(
            initialValue = 0.15f,
            targetValue  = 1f,
            animationSpec = infiniteRepeatable(
                animation     = tween(duration, easing = FastOutSlowInEasing),
                repeatMode    = RepeatMode.Reverse,
                initialStartOffset = StartOffset(offset),
            ),
            label = "bar$i",
        )
    }

    val maxBarHeightDp = 32.dp
    val barWidthDp     = 3.5.dp
    val cornerDp       = 2.dp
    val spacingDp      = 4.dp

    Row(
        horizontalArrangement = Arrangement.spacedBy(spacingDp),
        verticalAlignment     = Alignment.CenterVertically,
        modifier = Modifier.height(maxBarHeightDp),
    ) {
        heights.forEachIndexed { i, animatedHeight ->
            val h by animatedHeight
            val fraction = if (isPlaying) h else 0.15f

            // Taller middle bars for a natural arch shape when idle
            val minFraction = if (i == barCount / 2) 0.45f else 0.15f
            val displayFraction = maxOf(fraction, minFraction)

            Box(
                modifier = Modifier
                    .width(barWidthDp)
                    .fillMaxHeight(displayFraction)
                    .clip(RoundedCornerShape(cornerDp))
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                LiveGold.copy(alpha = 0.9f),
                                LiveCoral,
                            ),
                        ),
                    ),
            )
        }
    }
}

// ── Cover art — geometric Islamic abstract ────────────────────────────────────

@Composable
private fun CoverArtCard() {
    Box(
        modifier = Modifier
            .size(240.dp)
            .shadow(
                elevation = 28.dp,
                shape = RoundedCornerShape(32.dp),
                ambientColor = LiveGold.copy(alpha = 0.25f),
                spotColor = LiveGold.copy(alpha = 0.30f),
            )
            .clip(RoundedCornerShape(32.dp))
            .background(
                Brush.radialGradient(
                    listOf(Color(0xFF2A5A3A), Color(0xFF0B3D33), Color(0xFF052E28)),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size(180.dp)) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val gold = android.graphics.Color.parseColor("#D4B26A")
            val goldColor = Color(gold)

            // Outer thin ring
            drawCircle(
                color = goldColor.copy(alpha = 0.18f),
                radius = size.minDimension / 2f,
                style = Stroke(width = 1.dp.toPx()),
            )
            // Second ring
            drawCircle(
                color = goldColor.copy(alpha = 0.28f),
                radius = size.minDimension * 0.38f,
                style = Stroke(width = 1.dp.toPx()),
            )
            // Inner filled circle
            drawCircle(
                color = goldColor.copy(alpha = 0.10f),
                radius = size.minDimension * 0.22f,
            )
            drawCircle(
                color = goldColor.copy(alpha = 0.45f),
                radius = size.minDimension * 0.22f,
                style = Stroke(width = 1.5.dp.toPx()),
            )

            // 8 radial lines (star pattern)
            val lineCount = 8
            val outerR = size.minDimension * 0.48f
            val innerR = size.minDimension * 0.24f
            for (i in 0 until lineCount) {
                val angle = Math.toRadians(i * (360.0 / lineCount)).toFloat()
                val startX = cx + innerR * kotlin.math.cos(angle)
                val startY = cy + innerR * kotlin.math.sin(angle)
                val endX   = cx + outerR * kotlin.math.cos(angle)
                val endY   = cy + outerR * kotlin.math.sin(angle)
                drawLine(
                    color = goldColor.copy(alpha = 0.30f),
                    start = Offset(startX, startY),
                    end   = Offset(endX, endY),
                    strokeWidth = 1.dp.toPx(),
                    cap = StrokeCap.Round,
                )
            }

            // Center dot
            drawCircle(
                color = goldColor.copy(alpha = 0.70f),
                radius = 3.dp.toPx(),
            )
        }
    }
}

// ── Broadcast ended screen ─────────────────────────────────────────────────────

@Composable
private fun BroadcastEndedScreen(onBack: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LiveBg),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 40.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(LiveSurface),
                contentAlignment = Alignment.Center,
            ) {
                Text("◎", color = LiveGoldMuted, fontSize = 30.sp)
            }
            Spacer(Modifier.height(22.dp))
            Text(
                "Broadcast has ended",
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                ),
                color = LiveCream.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Jazakallah for listening",
                style = MaterialTheme.typography.bodySmall,
                color = LiveGoldMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(32.dp))
            Surface(
                shape = RoundedCornerShape(50.dp),
                color = LiveSurface,
                modifier = Modifier.clickable { onBack() },
            ) {
                Text(
                    "BACK",
                    style = MaterialTheme.typography.labelMedium.copy(
                        letterSpacing = 0.12.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = LiveGold,
                    modifier = Modifier.padding(horizontal = 28.dp, vertical = 12.dp),
                )
            }
        }
    }
}

// ── No live session placeholder ────────────────────────────────────────────────

@Composable
private fun NoLiveScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LiveBg),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF0B4A43)),
                contentAlignment = Alignment.Center,
            ) {
                Text("◎", color = LiveGold, fontSize = 30.sp)
            }
            Spacer(Modifier.height(22.dp))
            Text(
                "No live session right now",
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                ),
                color = LiveCream.copy(alpha = 0.8f),
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Check the schedule for upcoming sessions",
                style = MaterialTheme.typography.bodySmall,
                color = LiveGoldMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 40.dp),
            )
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

private fun computeInitialElapsed(startedAt: String): Int = try {
    val started = Instant.parse(startedAt)
    val diff = Instant.now().epochSecond - started.epochSecond
    if (diff in 0..86400) diff.toInt() else 0
} catch (_: Exception) { 0 }

private fun formatStartTime(startedAt: String): String = try {
    val inst = Instant.parse(startedAt)
    val zdt  = inst.atZone(ZoneId.systemDefault())
    val h    = zdt.hour
    val m    = zdt.minute
    val h12  = if (h % 12 == 0) 12 else h % 12
    val mm   = "%02d".format(m)
    val ampm = if (h < 12) "AM" else "PM"
    "$h12:$mm $ampm"
} catch (_: Exception) { "" }
