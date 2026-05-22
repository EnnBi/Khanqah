package com.khanqah.admin.ui.live

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.LiveSession
import com.khanqah.admin.data.model.ScheduledSession
import androidx.compose.animation.core.*

// Colors pulled from theme at call sites via MaterialTheme.colorScheme

@Composable
fun LiveScreen(
    currentSession: LiveSession?,
    sessions: List<ScheduledSession>,
    onStart: (titleEn: String, titleUr: String, streamUrl: String) -> Unit,
    onEnd: (id: String) -> Unit,
) {
    val nextSession = remember(sessions) { sessions.nextUpcoming() }

    var titleEn   by remember { mutableStateOf("") }
    var titleUr   by remember { mutableStateOf("") }
    var streamUrl by remember { mutableStateOf("") }

    // Pre-fill from next session when it loads
    LaunchedEffect(nextSession) {
        if (nextSession != null && titleEn.isBlank()) {
            titleEn = nextSession.titleEn
            titleUr = nextSession.titleUr
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(16.dp))

        // Header
        Text(
            "LIVE CONTROL",
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                letterSpacing = 0.12.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = MaterialTheme.colorScheme.primary,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Khanqah Admin",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(Modifier.height(32.dp))

        if (currentSession != null) {
            // ── Currently LIVE ──
            LiveActiveCard(session = currentSession, onEnd = onEnd)
        } else {
            // ── Next scheduled session ──
            if (nextSession != null) {
                NextSessionCard(
                    session = nextSession,
                    onUse = {
                        titleEn = nextSession.titleEn
                        titleUr = nextSession.titleUr
                    },
                )
                Spacer(Modifier.height(24.dp))
            }

            // ── Start Live form ──
            Text(
                "START A LIVE SESSION",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    letterSpacing = 0.10.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))

            OutlinedTextField(
                value = titleEn,
                onValueChange = { titleEn = it },
                label = { Text("Title (English)") },
                placeholder = { Text("e.g. Monday Majlis") },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))

            OutlinedTextField(
                value = titleUr,
                onValueChange = { titleUr = it },
                label = { Text("عنوان (اردو)") },
                placeholder = { Text("مثلاً پیر مجلس") },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))

            OutlinedTextField(
                value = streamUrl,
                onValueChange = { streamUrl = it },
                label = { Text("Stream URL (HLS)") },
                placeholder = { Text("https://…") },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    if (titleEn.isNotBlank() && streamUrl.isNotBlank())
                        onStart(titleEn, titleUr, streamUrl)
                },
                enabled = titleEn.isNotBlank() && streamUrl.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                    disabledContentColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f),
                ),
            ) {
                Text(
                    "Go Live",
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                )
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun NextSessionCard(session: ScheduledSession, onUse: () -> Unit) {
    val (day, mon, time) = parseDateParts(session.scheduledAt, session.isRecurring, session.recurrenceRule)
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "NEXT SCHEDULED",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.08.sp),
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp).widthIn(min = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            day,
                            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.primary,
                            lineHeight = 28.sp,
                        )
                        Text(
                            mon,
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, fontWeight = FontWeight.SemiBold),
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        session.titleEn,
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    if (session.titleUr.isNotBlank()) {
                        Text(
                            session.titleUr,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    Text(
                        time,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = onUse,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
            ) {
                Text("Use this session's title", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun LiveActiveCard(session: LiveSession, onEnd: (String) -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "livePulse")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 0.2f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "dot",
    )

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.errorContainer,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(10.dp)
                        .alpha(dotAlpha)
                        .background(MaterialTheme.colorScheme.error, CircleShape)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "LIVE NOW",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.08.sp,
                    ),
                    color = MaterialTheme.colorScheme.error,
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                session.titleEn,
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onErrorContainer,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = { onEnd(session.id) },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError,
                ),
            ) {
                Text("End Live Session", style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold))
            }
        }
    }
}

// Compute next actual occurrence for recurring sessions
private fun List<ScheduledSession>.nextUpcoming(): ScheduledSession? {
    val now = java.time.Instant.now()
    return mapNotNull { s ->
        runCatching {
            val base = java.time.Instant.parse(s.scheduledAt)
            if (!s.isRecurring || s.recurrenceRule == null) {
                return@mapNotNull if (base.isAfter(now)) (s to base) else null
            }
            if (base.isAfter(now)) return@mapNotNull s to base
            val zone = java.time.ZoneId.systemDefault()
            var d = base.atZone(zone)
            val rule = s.recurrenceRule
            when {
                rule.contains("DAILY")   -> { while (!d.toInstant().isAfter(now)) d = d.plusDays(1) }
                rule.contains("WEEKLY")  -> { while (!d.toInstant().isAfter(now)) d = d.plusWeeks(1) }
                rule.contains("MONTHLY") -> { while (!d.toInstant().isAfter(now)) d = d.plusMonths(1) }
                else -> return@mapNotNull if (base.isAfter(now)) s to base else null
            }
            s to d.toInstant()
        }.getOrNull()
    }.minByOrNull { (_, inst) -> inst }?.first
}

private fun parseDateParts(scheduledAt: String, isRecurring: Boolean, rule: String?): Triple<String, String, String> =
    try {
        val now  = java.time.Instant.now()
        val base = java.time.Instant.parse(scheduledAt)
        val zone = java.time.ZoneId.systemDefault()
        val inst = if (!isRecurring || rule == null || base.isAfter(now)) base else {
            var d = base.atZone(zone)
            when {
                rule.contains("DAILY")   -> { while (!d.toInstant().isAfter(now)) d = d.plusDays(1) }
                rule.contains("WEEKLY")  -> { while (!d.toInstant().isAfter(now)) d = d.plusWeeks(1) }
                rule.contains("MONTHLY") -> { while (!d.toInstant().isAfter(now)) d = d.plusMonths(1) }
            }
            d.toInstant()
        }
        val zdt = inst.atZone(zone)
        val h = zdt.hour; val m = zdt.minute
        val h12 = if (h % 12 == 0) 12 else h % 12
        val mm  = "%02d".format(m)
        val period = if (h < 12) "AM" else "PM"
        Triple(
            zdt.dayOfMonth.toString(),
            zdt.month.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH).uppercase(),
            "${zdt.dayOfWeek.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH)}, $h12:$mm $period",
        )
    } catch (_: Exception) { Triple("?", "???", scheduledAt) }
