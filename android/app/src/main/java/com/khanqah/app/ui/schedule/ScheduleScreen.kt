package com.khanqah.app.ui.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.data.model.ScheduledSession
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu
import com.khanqah.app.ui.utils.ScheduleStr

@Composable
fun ScheduleScreen(sessions: List<ScheduledSession>) {
    val isUrdu = LocalIsUrdu.current
    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text(
                if (isUrdu) ScheduleStr.TITLE_UR else ScheduleStr.TITLE_EN,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                    fontSize = if (isUrdu) 14.sp else 10.sp,
                    letterSpacing = if (isUrdu) 0.sp else 0.12.sp,
                ),
                color = MaterialTheme.colorScheme.tertiary,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                if (isUrdu) ScheduleStr.UPCOMING_UR else ScheduleStr.UPCOMING_EN,
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                    fontWeight = FontWeight.Bold,
                    fontSize = if (isUrdu) 38.sp else 32.sp,
                ),
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }

        if (sessions.isEmpty()) {
            item {
                Box(
                    Modifier.fillParentMaxWidth().padding(top = 48.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (isUrdu) ScheduleStr.NO_SCHED_UR else ScheduleStr.NO_SCHED_EN,
                        style = MaterialTheme.typography.bodyLarge.copy(fontStyle = FontStyle.Italic),
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            }
        }

        items(sessions) { s -> ScheduleCard(session = s) }
    }
}

@Composable
private fun ScheduleCard(session: ScheduledSession) {
    val isUrdu = LocalIsUrdu.current
    val (day, mon, weekdayTime) = parseDateParts(session.scheduledAt)
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            // Date block
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.15f),
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp).widthIn(min = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        day,
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.tertiary,
                        lineHeight = 28.sp,
                    )
                    Text(
                        mon,
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold, fontSize = 10.sp, letterSpacing = 0.06.sp),
                        color = MaterialTheme.colorScheme.tertiary,
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
                        fontFamily = NastaleeqFontFamily,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.tertiary,
                        textAlign = TextAlign.End,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    weekdayTime,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
                if (session.isRecurring) {
                    Spacer(Modifier.height(6.dp))
                    val label = if (isUrdu) ScheduleStr.RECURRING_UR else when {
                        session.recurrenceRule?.contains("DAILY") == true -> "DAILY"
                        session.recurrenceRule?.contains("WEEKLY") == true -> "WEEKLY"
                        session.recurrenceRule?.contains("MONTHLY") == true -> "MONTHLY"
                        else -> "RECURRING"
                    }
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                    ) {
                        Text(
                            label,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.06.sp),
                            color = MaterialTheme.colorScheme.tertiary,
                        )
                    }
                }
            }
        }
    }
}

private fun parseDateParts(scheduledAt: String): Triple<String, String, String> = try {
    val instant = java.time.Instant.parse(scheduledAt)
    val zdt = instant.atZone(java.time.ZoneId.systemDefault())
    Triple(
        zdt.dayOfMonth.toString(),
        zdt.month.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH).uppercase(),
        zdt.format(java.time.format.DateTimeFormatter.ofPattern("EEEE, h:mm a")),
    )
} catch (_: Exception) { Triple("?", "???", scheduledAt) }
