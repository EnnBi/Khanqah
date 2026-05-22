package com.khanqah.admin.ui.live

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.LiveSession
import com.khanqah.admin.data.model.ScheduledSession

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiveScreen(
    currentSession: LiveSession?,
    sessions: List<ScheduledSession>,
    categories: List<Category>,
    isStreaming: Boolean,
    error: String?,
    onStart: (categoryId: String, titleEn: String, titleUr: String) -> Unit,
    onEnd: (id: String) -> Unit,
) {
    val nextSession = remember(sessions) { sessions.nextUpcoming() }
    var selectedCategory by remember(categories) { mutableStateOf(categories.firstOrNull()) }
    var dropdownExpanded by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }

    // Pre-fill from next session when it loads
    LaunchedEffect(nextSession) {
        if (nextSession != null && titleEn.isBlank()) {
            titleEn = nextSession.titleEn
            titleUr = nextSession.titleUr
        }
    }

    val ctx = LocalContext.current
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) selectedCategory?.let { onStart(it.id, titleEn, titleUr) }
    }

    fun goLive() {
        val cat = selectedCategory ?: return
        if (titleEn.isBlank()) return
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            onStart(cat.id, titleEn, titleUr)
        } else {
            permLauncher.launch(Manifest.permission.RECORD_AUDIO)
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
            LiveActiveCard(session = currentSession, isStreaming = isStreaming, onEnd = onEnd)
        } else {
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

            // Category dropdown
            ExposedDropdownMenuBox(
                expanded = dropdownExpanded,
                onExpandedChange = { dropdownExpanded = !dropdownExpanded },
            ) {
                OutlinedTextField(
                    value = selectedCategory?.nameEn ?: if (categories.isEmpty()) "Loading…" else "Select category",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Stream type") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(dropdownExpanded) },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                    ),
                )
                ExposedDropdownMenu(
                    expanded = dropdownExpanded,
                    onDismissRequest = { dropdownExpanded = false },
                ) {
                    categories.forEach { cat ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(cat.nameEn, style = MaterialTheme.typography.bodyMedium)
                                    if (cat.nameUr.isNotBlank()) {
                                        Text(
                                            cat.nameUr,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                    }
                                }
                            },
                            onClick = { selectedCategory = cat; dropdownExpanded = false },
                        )
                    }
                }
            }
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

            if (error != null) {
                Spacer(Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        error,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = ::goLive,
                enabled = selectedCategory != null && titleEn.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                    disabledContentColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f),
                ),
            ) {
                Icon(Icons.Outlined.Mic, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
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
private fun LiveActiveCard(session: LiveSession, isStreaming: Boolean, onEnd: (String) -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "livePulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 0.2f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "pulse",
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
                        .alpha(pulseAlpha)
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

            Spacer(Modifier.height(16.dp))

            // Mic streaming indicator
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                Icon(
                    Icons.Outlined.Mic,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp).alpha(if (isStreaming) pulseAlpha else 0.4f),
                    tint = if (isStreaming) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onErrorContainer,
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    if (isStreaming) "Streaming audio" else "Connecting…",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isStreaming) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.6f),
                )
            }

            Spacer(Modifier.height(20.dp))

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
