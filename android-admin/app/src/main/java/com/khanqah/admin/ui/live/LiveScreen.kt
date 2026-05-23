package com.khanqah.admin.ui.live

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.LiveSession
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.ui.theme.*
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiveScreen(
    currentSession: LiveSession?,
    sessions: List<ScheduledSession>,
    categories: List<Category>,
    isStreaming: Boolean,
    error: String?,
    listenerCount: Int = 0,
    onStart: (categoryId: String, titleEn: String, titleUr: String, record: Boolean) -> Unit,
    onEnd: (id: String) -> Unit,
) {
    if (currentSession != null) {
        LiveOnAirScreen(session = currentSession, isStreaming = isStreaming, listenerCount = listenerCount, onEnd = onEnd)
        return
    }

    // ── Setup screen ─────────────────────────────────────────────────────────
    val nextSession = remember(sessions) { sessions.nextUpcoming() }
    var selectedCategory by remember(categories) { mutableStateOf(categories.firstOrNull()) }
    var dropdownExpanded by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var recordBroadcast by remember { mutableStateOf(false) }

    val ctx = LocalContext.current
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) selectedCategory?.let { onStart(it.id, titleEn, titleUr, recordBroadcast) }
    }

    fun goLive() {
        val cat = selectedCategory ?: return
        if (titleEn.isBlank()) return
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            onStart(cat.id, titleEn, titleUr, recordBroadcast)
        } else {
            permLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    val canStart = selectedCategory != null && titleEn.isNotBlank()

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor     = AdminSurfaceVar,
        unfocusedContainerColor   = AdminSurfaceVar,
        focusedBorderColor        = AdminGold,
        unfocusedBorderColor      = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor         = AdminGold,
        unfocusedLabelColor       = AdminGold.copy(alpha = 0.55f),
        focusedTextColor          = AdminCream,
        unfocusedTextColor        = AdminCream,
        cursorColor               = AdminGold,
        focusedPlaceholderColor   = AdminCream.copy(alpha = 0.30f),
        unfocusedPlaceholderColor = AdminCream.copy(alpha = 0.30f),
        focusedTrailingIconColor   = AdminGold,
        unfocusedTrailingIconColor = AdminGold.copy(alpha = 0.55f),
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(52.dp))

        Text(
            "◆  BROADCAST CONTROL",
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                letterSpacing = 0.16.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = AdminGold,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Ready to Broadcast",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.5).sp,
            ),
            color = AdminCream,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Fill in the session details below,\nthen tap the button to go live.",
            style = MaterialTheme.typography.bodySmall.copy(lineHeight = 19.sp),
            color = AdminCream.copy(alpha = 0.48f),
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(32.dp))

        if (nextSession != null) {
            NextSessionCard(
                session = nextSession,
                onUse = {
                    titleEn = nextSession.titleEn
                    titleUr = nextSession.titleUr
                },
            )
            Spacer(Modifier.height(28.dp))
        }

        Text(
            "SESSION DETAILS",
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                letterSpacing = 0.14.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = AdminGold.copy(alpha = 0.7f),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(10.dp))

        ExposedDropdownMenuBox(
            expanded = dropdownExpanded,
            onExpandedChange = { dropdownExpanded = !dropdownExpanded },
        ) {
            OutlinedTextField(
                value = selectedCategory?.nameEn
                    ?: if (categories.isEmpty()) "Loading…" else "Select stream type",
                onValueChange = {},
                readOnly = true,
                label = { Text("Stream Type") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(dropdownExpanded) },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().menuAnchor(),
                colors = fieldColors,
            )
            ExposedDropdownMenu(
                expanded = dropdownExpanded,
                onDismissRequest = { dropdownExpanded = false },
                modifier = Modifier.background(AdminSurface),
            ) {
                categories.forEach { cat ->
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(cat.nameEn, style = MaterialTheme.typography.bodyMedium, color = AdminCream)
                                if (cat.nameUr.isNotBlank()) {
                                    Text(cat.nameUr, style = MaterialTheme.typography.bodySmall, color = AdminGold)
                                }
                            }
                        },
                        onClick = { selectedCategory = cat; dropdownExpanded = false },
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = titleEn,
            onValueChange = { titleEn = it },
            label = { Text("Session Title (English)") },
            placeholder = { Text("e.g. Monday Majlis") },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            colors = fieldColors,
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = titleUr,
            onValueChange = { titleUr = it },
            label = { Text("عنوان (اردو)") },
            placeholder = { Text("مثلاً پیر مجلس") },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            colors = fieldColors,
        )

        Spacer(Modifier.height(20.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(AdminSurfaceVar)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    "Record Broadcast",
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = AdminCream,
                )
                Text(
                    "Save recording as content after broadcast ends",
                    style = MaterialTheme.typography.bodySmall,
                    color = AdminCream.copy(alpha = 0.48f),
                )
            }
            Switch(
                checked = recordBroadcast,
                onCheckedChange = { recordBroadcast = it },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = AdminBackground,
                    checkedTrackColor = AdminGold,
                    uncheckedThumbColor = AdminCream.copy(alpha = 0.55f),
                    uncheckedTrackColor = AdminSurface,
                    uncheckedBorderColor = AdminGold.copy(alpha = 0.30f),
                ),
            )
        }

        if (error != null) {
            Spacer(Modifier.height(14.dp))
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFF3D1825),
                border = BorderStroke(1.dp, AdminError.copy(alpha = 0.45f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    error,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = AdminError,
                )
            }
        }

        Spacer(Modifier.height(28.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(58.dp)
                .clip(RoundedCornerShape(30.dp))
                .background(
                    Brush.horizontalGradient(
                        if (canStart)
                            listOf(AdminCoral, Color(0xFFD45B55))
                        else
                            listOf(AdminCoral.copy(alpha = 0.30f), Color(0xFFD45B55).copy(alpha = 0.30f)),
                    ),
                )
                .clickable(enabled = canStart) { goLive() },
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.Mic,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = Color.White.copy(alpha = if (canStart) 1f else 0.45f),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    "START BROADCAST",
                    style = MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.06.sp,
                    ),
                    color = Color.White.copy(alpha = if (canStart) 1f else 0.45f),
                )
            }
        }

        Spacer(Modifier.height(48.dp))
    }
}

// ── Live on-air full-screen ───────────────────────────────────────────────────

@Composable
private fun LiveOnAirScreen(session: LiveSession, isStreaming: Boolean, listenerCount: Int, onEnd: (String) -> Unit) {
    var elapsedSeconds by remember { mutableIntStateOf(0) }
    LaunchedEffect(session.id) {
        elapsedSeconds = 0
        while (true) {
            delay(1000)
            elapsedSeconds++
        }
    }

    val timerText = if (elapsedSeconds < 3600) {
        "%02d:%02d".format(elapsedSeconds / 60, elapsedSeconds % 60)
    } else {
        "%02d:%02d:%02d".format(elapsedSeconds / 3600, (elapsedSeconds % 3600) / 60, elapsedSeconds % 60)
    }

    val infiniteTransition = rememberInfiniteTransition(label = "livePulse")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 0.15f,
        animationSpec = infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "dot",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AdminBackground),
    ) {
        // ── Center content ──
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // ON AIR indicator
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(9.dp)
                        .alpha(dotAlpha)
                        .background(AdminCoral, CircleShape),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "ON AIR",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        letterSpacing = 0.20.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                    color = AdminCoral,
                )
            }

            Spacer(Modifier.height(28.dp))

            // Session title
            Text(
                session.titleEn,
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Serif,
                    letterSpacing = (-0.5).sp,
                    lineHeight = 42.sp,
                ),
                color = AdminCream,
                textAlign = TextAlign.Center,
            )

            // Urdu subtitle
            if (session.titleUr.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(
                    session.titleUr,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontStyle = FontStyle.Italic,
                        fontFamily = FontFamily.Serif,
                        letterSpacing = 0.sp,
                    ),
                    color = AdminGold.copy(alpha = 0.75f),
                    textAlign = TextAlign.Center,
                )
            }

            Spacer(Modifier.height(44.dp))

            // Timer
            Text(
                timerText,
                style = MaterialTheme.typography.displayMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Serif,
                    letterSpacing = 2.sp,
                ),
                color = AdminGold,
            )

            Spacer(Modifier.height(10.dp))

            // Listeners
            Text(
                "$listenerCount ${if (listenerCount == 1) "LISTENER" else "LISTENERS"}",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 11.sp,
                    letterSpacing = 0.16.sp,
                ),
                color = AdminCream.copy(alpha = 0.38f),
            )
        }

        // ── Stop button ──
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 24.dp, vertical = 52.dp)
                .fillMaxWidth()
                .height(60.dp)
                .shadow(
                    elevation = 12.dp,
                    shape = RoundedCornerShape(30.dp),
                    ambientColor = AdminCoral.copy(alpha = 0.35f),
                    spotColor = AdminCoral.copy(alpha = 0.45f),
                )
                .clip(RoundedCornerShape(30.dp))
                .background(AdminCoral)
                .clickable { onEnd(session.id) },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "STOP BROADCAST",
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.10.sp,
                ),
                color = Color.White,
            )
        }
    }
}

// ── Next session card ─────────────────────────────────────────────────────────

@Composable
private fun NextSessionCard(session: ScheduledSession, onUse: () -> Unit) {
    val (day, mon, time) = parseDateParts(session.scheduledAt, session.isRecurring, session.recurrenceRule)
    val recurrenceLabel = when {
        session.recurrenceRule?.contains("DAILY") == true   -> "DAILY"
        session.recurrenceRule?.contains("WEEKLY") == true  -> "WEEKLY"
        session.recurrenceRule?.contains("MONTHLY") == true -> "MONTHLY"
        else -> null
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 18.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = AdminGold.copy(alpha = 0.22f),
                spotColor = AdminGold.copy(alpha = 0.30f),
            )
            .clip(RoundedCornerShape(16.dp))
            .background(AdminSurface)
            .border(1.dp, AdminGold.copy(alpha = 0.60f), RoundedCornerShape(16.dp))
            .clickable { onUse() }
            .padding(18.dp),
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(6.dp).background(AdminGold, CircleShape))
                    Spacer(Modifier.width(7.dp))
                    Text(
                        "NEXT SCHEDULED  •  TAP TO USE",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 9.sp,
                            letterSpacing = 0.12.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                        color = AdminGold,
                    )
                }
                if (recurrenceLabel != null) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = AdminGold.copy(alpha = 0.12f),
                        border = BorderStroke(0.5.dp, AdminGold.copy(alpha = 0.45f)),
                    ) {
                        Text(
                            recurrenceLabel,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.08.sp,
                            ),
                            color = AdminGold,
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = AdminGold.copy(alpha = 0.10f),
                    border = BorderStroke(0.5.dp, AdminGold.copy(alpha = 0.40f)),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp).widthIn(min = 50.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            day,
                            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                            color = AdminGold,
                            lineHeight = 30.sp,
                        )
                        Text(
                            mon,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = AdminGold.copy(alpha = 0.75f),
                        )
                    }
                }

                Spacer(Modifier.width(14.dp))

                Column(Modifier.weight(1f)) {
                    Text(
                        session.titleEn,
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = AdminCream,
                    )
                    if (session.titleUr.isNotBlank()) {
                        Spacer(Modifier.height(2.dp))
                        Text(session.titleUr, fontSize = 15.sp, color = AdminGold.copy(alpha = 0.90f))
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        time,
                        style = MaterialTheme.typography.bodySmall,
                        color = AdminCream.copy(alpha = 0.45f),
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            HorizontalDivider(color = AdminGold.copy(alpha = 0.18f), thickness = 0.5.dp)
            Spacer(Modifier.height(10.dp))
            Text(
                "Tap to prefill session details  →",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                color = AdminGold.copy(alpha = 0.55f),
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
            )
        }
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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
