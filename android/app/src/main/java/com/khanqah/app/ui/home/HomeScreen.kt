package com.khanqah.app.ui.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.R
import com.khanqah.app.data.db.entities.ContentEntity
import com.khanqah.app.ui.components.TypeIconSquare
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.HomeStr
import com.khanqah.app.ui.utils.LocalIsUrdu

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onContentClick: (String) -> Unit,
    onLiveClick: () -> Unit = {},
    onLibraryClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onScheduleClick: () -> Unit = {},
    onComingSoonClick: (String) -> Unit = {},
    onCategoryTypeClick: (String) -> Unit = {},
) {
    val content by viewModel.content.collectAsState(emptyList())
    val live by viewModel.live.collectAsState()
    val schedule by viewModel.schedule.collectAsState()
    val gold = MaterialTheme.colorScheme.tertiary
    val cardBg = MaterialTheme.colorScheme.surface
    val bg = MaterialTheme.colorScheme.background
    val heroBg = MaterialTheme.colorScheme.primary
    val isUrdu = LocalIsUrdu.current

    val statusCard = live?.let { Triple(true, it.titleEn, "") }
        ?: schedule.firstOrNull { s ->
            try { java.time.Instant.parse(s.scheduledAt).isAfter(java.time.Instant.now()) }
            catch (_: Exception) { false }
        }?.let { s ->
            val title = if (isUrdu && s.titleUr.isNotBlank()) s.titleUr else s.titleEn
            Triple(false, title, formatRelativeTime(s.scheduledAt, isUrdu))
        }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bg)
            .padding(horizontal = 16.dp),
    ) {

        Spacer(Modifier.height(8.dp))

        // ── Hero banner — fills slack space, future carousel slot ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(RoundedCornerShape(22.dp))
                .drawBehind {
                    drawRect(color = heroBg)
                    val cx = size.width - 16f
                    val cy = -16f
                    for (r in listOf(80f, 130f, 188f, 255f)) {
                        drawCircle(
                            color = Color(0xFFD4AF37).copy(alpha = 0.09f),
                            radius = r,
                            center = Offset(cx, cy),
                            style = Stroke(width = 1f),
                        )
                    }
                },
        ) {
            // Calligraphy logo — centred, fills ~60% of card width
            Image(
                painter = painterResource(R.drawable.khanqah_logo),
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth(0.58f)
                    .aspectRatio(1f)
                    .align(Alignment.Center),
                contentScale = ContentScale.Fit,
            )

            // Subtitle pinned to bottom centre
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 14.dp),
            ) {
                Text("— ", color = gold.copy(alpha = 0.45f), fontSize = 10.sp)
                Text("✦", color = gold.copy(alpha = 0.55f), fontSize = 8.sp)
                Text(" ", fontSize = 10.sp)
                Text(
                    if (isUrdu) HomeStr.TITLE_UR else HomeStr.TITLE_EN,
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontFamily = if (isUrdu) NastaleeqFontFamily else CrimsonProFontFamily,
                        fontStyle = if (isUrdu) FontStyle.Normal else FontStyle.Italic,
                        fontSize = if (isUrdu) 14.sp else 12.sp,
                    ),
                    color = gold,
                )
                Text(" ", fontSize = 10.sp)
                Text("✦", color = gold.copy(alpha = 0.55f), fontSize = 8.sp)
                Text(" —", color = gold.copy(alpha = 0.45f), fontSize = 10.sp)
            }
        }

        Spacer(Modifier.height(8.dp))

        // ── Event / status card ──
        if (statusCard != null) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { if (statusCard.first) onLiveClick() },
                shape = RoundedCornerShape(16.dp),
                color = cardBg,
                tonalElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(gold.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.CalendarMonth,
                            contentDescription = null,
                            tint = gold,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        if (statusCard.first) {
                            LiveDot()
                        } else {
                            Text(
                                if (isUrdu) "آف ایئر · اگلی مجلس" else "OFF AIR · NEXT MAJLIS",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                    fontSize = if (isUrdu) 12.sp else 8.sp,
                                    letterSpacing = if (isUrdu) 0.sp else 0.06.sp,
                                ),
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        }
                        Text(
                            statusCard.second,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = if (isUrdu) 18.sp else 13.sp,
                            ),
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (statusCard.third.isNotBlank()) {
                            Text(
                                statusCard.third,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                    fontSize = if (isUrdu) 14.sp else 11.sp,
                                ),
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        }
                    }
                    Text("›", color = gold, fontSize = 20.sp)
                }
            }
            Spacer(Modifier.height(8.dp))
        }

        // ── Feature grid — 2 rows × 3 cols ──
        data class FeatureItem(val label: String, val icon: ImageVector, val onClick: () -> Unit)
        val row1 = listOf(
            FeatureItem(if (isUrdu) HomeStr.MAMULAT_UR      else HomeStr.MAMULAT_EN,      Icons.Filled.Star,     { onCategoryTypeClick("mamulat") }),
            FeatureItem(if (isUrdu) HomeStr.MAJALIS_UR      else HomeStr.MAJALIS_EN,      Icons.Filled.Groups,   { onCategoryTypeClick("majalis") }),
            FeatureItem(if (isUrdu) HomeStr.SALAH_UR        else HomeStr.SALAH_EN,        Icons.Filled.Schedule, { onComingSoonClick("Salah Timings") }),
        )
        val row2 = listOf(
            FeatureItem(if (isUrdu) HomeStr.MAJLIS_TIMES_UR else HomeStr.MAJLIS_TIMES_EN, Icons.Filled.Event,               onScheduleClick),
            FeatureItem(if (isUrdu) HomeStr.CATEGORIES_UR  else HomeStr.CATEGORIES_EN,   Icons.Filled.GridView,            onLibraryClick),
            FeatureItem(if (isUrdu) HomeStr.ASK_HAZRAT_UR  else HomeStr.ASK_HAZRAT_EN,   Icons.AutoMirrored.Filled.Chat,   { onComingSoonClick("Ask Hazrat") }),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            row1.forEach { FeatureTile(it.label, it.icon, it.onClick, Modifier.weight(1f)) }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            row2.forEach { FeatureTile(it.label, it.icon, it.onClick, Modifier.weight(1f)) }
        }

        // ── Recents ──
        if (content.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    if (isUrdu) HomeStr.RECENTS_UR else HomeStr.RECENTS_EN,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = if (isUrdu) NastaleeqFontFamily else CrimsonProFontFamily,
                        fontStyle = if (isUrdu) FontStyle.Normal else FontStyle.Italic,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = if (isUrdu) 22.sp else 18.sp,
                    ),
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    "→",
                    style = MaterialTheme.typography.bodyMedium,
                    color = gold,
                    modifier = Modifier.clickable(onClick = onLibraryClick),
                )
            }
            LazyRow(
                contentPadding = PaddingValues(end = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(content) { item ->
                    RecentCard(item = item, onClick = { onContentClick(item.id) })
                }
            }
        }
    }
}

@Composable
private fun FeatureTile(label: String, icon: ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val ur = LocalIsUrdu.current
    Surface(
        modifier = modifier.height(80.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(6.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.tertiaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onTertiaryContainer,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.height(5.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontFamily = if (ur) NastaleeqFontFamily else null,
                    fontSize = if (ur) 13.sp else 9.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 0.sp,
                ),
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun RecentCard(item: ContentEntity, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.width(175.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier.padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TypeIconSquare(item.type, size = 40.dp)
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                val ur = LocalIsUrdu.current
                if (ur && item.titleUr.isNotBlank()) {
                    Text(
                        item.titleUr,
                        fontFamily = NastaleeqFontFamily,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                } else {
                    Text(
                        item.titleEn,
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 11.sp,
                            lineHeight = 14.sp,
                        ),
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(3.dp))
                Text(
                    item.type.uppercase(),
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp, letterSpacing = 0.04.sp),
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        }
    }
}

@Composable
private fun LiveDot() {
    val infiniteTransition = rememberInfiniteTransition(label = "liveDot")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 0.3f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "dotAlpha",
    )
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(5.dp).alpha(dotAlpha).background(MaterialTheme.colorScheme.error, CircleShape))
        Spacer(Modifier.width(3.dp))
        Text(
            "LIVE",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp, fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.error,
        )
    }
}

private fun formatRelativeTime(scheduledAt: String, isUrdu: Boolean): String { return try {
    val zone    = java.time.ZoneId.systemDefault()
    val instant = java.time.Instant.parse(scheduledAt)
    val diff    = java.time.Duration.between(java.time.Instant.now(), instant)
    if (diff.isNegative) return ""
    val mins = diff.toMinutes()
    val hrs  = diff.toHours()
    when {
        mins < 1  -> if (isUrdu) "ابھی" else "Now"
        mins < 60 -> if (isUrdu) "$mins منٹ میں" else "in ${mins}m"
        hrs  < 2  -> if (isUrdu) "$hrs گھنٹے میں" else "in ${hrs}h"
        else -> {
            val today   = java.time.LocalDate.now(zone)
            val sessDay = instant.atZone(zone).toLocalDate()
            val dayDiff = java.time.temporal.ChronoUnit.DAYS.between(today, sessDay)
            if (isUrdu) when (dayDiff) {
                0L  -> "$hrs گھنٹے میں"
                1L  -> "کل"
                2L  -> "پرسوں"
                else -> when (instant.atZone(zone).dayOfWeek) {
                    java.time.DayOfWeek.MONDAY    -> "پیر"
                    java.time.DayOfWeek.TUESDAY   -> "منگل"
                    java.time.DayOfWeek.WEDNESDAY -> "بدھ"
                    java.time.DayOfWeek.THURSDAY  -> "جمعرات"
                    java.time.DayOfWeek.FRIDAY    -> "جمعہ"
                    java.time.DayOfWeek.SATURDAY  -> "ہفتہ"
                    java.time.DayOfWeek.SUNDAY    -> "اتوار"
                }
            } else when (dayDiff) {
                0L  -> "in ${hrs}h"
                1L  -> "Tomorrow"
                2L  -> "Day after tomorrow"
                else -> instant.atZone(zone).dayOfWeek
                    .getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
            }
        }
    }
} catch (_: Exception) { "" } }
