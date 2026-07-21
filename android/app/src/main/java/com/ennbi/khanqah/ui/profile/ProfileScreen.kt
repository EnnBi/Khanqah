package com.khanqah.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.data.SettingsStore
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu
import com.khanqah.app.ui.utils.ProfileStr
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    isLoggedIn: Boolean,
    displayName: String,
    phone: String,
    role: String?,
    isUrdu: Boolean,
    settingsStore: SettingsStore,
    onLanguageToggle: () -> Unit,
    onSetNotifications: (Boolean) -> Unit,
    onLoginClick: () -> Unit,
    onAbout: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val themeMode by settingsStore.themeMode.collectAsState(initial = SettingsStore.ThemeMode.SYSTEM)
    val speed by settingsStore.playbackSpeed.collectAsState(initial = 1.0f)
    val skip by settingsStore.skipIntervalSec.collectAsState(initial = 15)
    val notif by settingsStore.notificationsEnabled.collectAsState(initial = true)
    var showThemeDialog by remember { mutableStateOf(false) }
    var showSpeedDialog by remember { mutableStateOf(false) }
    var showSkipDialog by remember { mutableStateOf(false) }
    val gold = MaterialTheme.colorScheme.tertiary
    val bg = MaterialTheme.colorScheme.background
    val card = MaterialTheme.colorScheme.surface
    val heroBg = MaterialTheme.colorScheme.primary
    val darkTheme = MaterialTheme.colorScheme.background.luminance() < 0.5f

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bg)
            .verticalScroll(rememberScrollState()),
    ) {
        // ── Header with decorative circles ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(110.dp)
                .drawBehind {
                    drawRect(color = heroBg)
                    val cx = size.width + 16f
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
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp, bottom = 16.dp),
            ) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        if (isUrdu) ProfileStr.TITLE_UR else ProfileStr.TITLE_EN,
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                            fontWeight = FontWeight.Bold,
                            fontSize = if (isUrdu) 32.sp else 28.sp,
                        ),
                        // Header band is always dark green (primary), so keep the title cream in both themes.
                        color = Color(0xFFF5F3EE),
                    )
                    Text(
                        " ${if (isUrdu) ProfileStr.SETTINGS_UR else ProfileStr.SETTINGS_EN}",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontFamily = if (isUrdu) NastaleeqFontFamily else CrimsonProFontFamily,
                            fontStyle = if (isUrdu) FontStyle.Normal else FontStyle.Italic,
                            fontWeight = FontWeight.Normal,
                            fontSize = if (isUrdu) 20.sp else 22.sp,
                        ),
                        color = gold,
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // ── User card ──
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(16.dp),
            color = card,
            tonalElevation = 0.dp,
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val initial = when {
                    isLoggedIn && displayName.isNotBlank() -> displayName.first().uppercaseChar().toString()
                    else -> "G"
                }
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(gold.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        initial,
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 20.sp,
                        ),
                        color = gold,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        if (isLoggedIn && displayName.isNotBlank()) displayName else if (isUrdu) ProfileStr.GUEST_UR else ProfileStr.GUEST_EN,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontFamily = if (isUrdu && !(isLoggedIn && displayName.isNotBlank())) NastaleeqFontFamily else null,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = if (isUrdu && !(isLoggedIn && displayName.isNotBlank())) 20.sp else 16.sp,
                        ),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        if (isLoggedIn) phone else if (isUrdu) ProfileStr.NOT_SIGNED_UR else ProfileStr.NOT_SIGNED_EN,
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontFamily = if (isUrdu && !isLoggedIn) NastaleeqFontFamily else null,
                            fontSize = if (isUrdu && !isLoggedIn) 14.sp else 11.sp,
                        ),
                        color = MaterialTheme.colorScheme.secondary,
                    )
                    role?.let {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            it.uppercase(),
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 8.sp,
                                letterSpacing = 0.06.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = gold,
                        )
                    }
                }
                if (isLoggedIn) {
                    OutlinedButton(
                        onClick = onLogout,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.secondary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Text(
                            if (isUrdu) ProfileStr.SIGN_OUT_UR else ProfileStr.SIGN_OUT_EN,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                fontSize = if (isUrdu) 13.sp else 9.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = if (isUrdu) 0.sp else 0.06.sp,
                            ),
                        )
                    }
                } else {
                    // Emerald button in light mode, gold in dark — each with a contrasting label.
                    val signInBg = if (darkTheme) gold else MaterialTheme.colorScheme.primary
                    val signInFg = if (darkTheme) Color(0xFF0F2E24) else Color(0xFFF5F3EE)
                    Button(
                        onClick = onLoginClick,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = signInBg,
                            contentColor = signInFg,
                        ),
                        elevation = ButtonDefaults.buttonElevation(0.dp),
                    ) {
                        Text(
                            if (isUrdu) ProfileStr.SIGN_IN_UR else ProfileStr.SIGN_IN_EN,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                fontSize = if (isUrdu) 13.sp else 9.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = if (isUrdu) 0.sp else 0.06.sp,
                            ),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Section 01: Preferences ──
        SectionHeader(
            number = "01",
            title = if (isUrdu) ProfileStr.PREF_TAG_UR else ProfileStr.PREF_TAG_EN,
            subtitle = if (isUrdu) ProfileStr.PREF_SUB_UR else ProfileStr.PREF_SUB_EN,
        )

        Spacer(Modifier.height(8.dp))

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(16.dp),
            color = card,
            tonalElevation = 0.dp,
        ) {
            Column {
                LanguageToggleRow(isUrdu = isUrdu, onToggle = onLanguageToggle)
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.APPEARANCE_UR else ProfileStr.APPEARANCE_EN,
                    themeLabel(themeMode, isUrdu)) { showThemeDialog = true }
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.SPEED_UR else ProfileStr.SPEED_EN,
                    speedLabel(speed)) { showSpeedDialog = true }
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.NOTIF_UR else ProfileStr.NOTIF_EN,
                    if (notif) (if (isUrdu) "آن" else "On") else (if (isUrdu) "آف" else "Off")) {
                    onSetNotifications(!notif)
                }
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.SKIP_UR else ProfileStr.SKIP_EN, "${skip}s") { showSkipDialog = true }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Section 02: About ──
        SectionHeader(
            number = "02",
            title = if (isUrdu) ProfileStr.ABOUT_TAG_UR else ProfileStr.ABOUT_TAG_EN,
            subtitle = if (isUrdu) ProfileStr.ABOUT_SUB_UR else ProfileStr.ABOUT_SUB_EN,
        )

        Spacer(Modifier.height(8.dp))

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(16.dp),
            color = card,
            tonalElevation = 0.dp,
        ) {
            Column {
                val aboutLabel = if (isUrdu) ProfileStr.ABOUT_UR else ProfileStr.ABOUT_EN
                val bioLabel = if (isUrdu) ProfileStr.BIO_UR else ProfileStr.BIO_EN
                AboutRow(aboutLabel) { onAbout(aboutLabel) }
                RowDivider()
                AboutRow(bioLabel) { onAbout(bioLabel) }
            }
        }

        Spacer(Modifier.height(32.dp))
    }

    if (showThemeDialog) {
        ChoiceDialog(
            title = if (isUrdu) ProfileStr.APPEARANCE_UR else ProfileStr.APPEARANCE_EN,
            options = SettingsStore.ThemeMode.entries.map { it to themeLabel(it, isUrdu) },
            selected = themeMode,
            isUrdu = isUrdu,
            onSelect = { scope.launch { settingsStore.setThemeMode(it) }; showThemeDialog = false },
            onDismiss = { showThemeDialog = false },
        )
    }
    if (showSpeedDialog) {
        ChoiceDialog(
            title = if (isUrdu) ProfileStr.SPEED_UR else ProfileStr.SPEED_EN,
            options = listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f).map { it to speedLabel(it) },
            selected = speed,
            isUrdu = isUrdu,
            onSelect = { scope.launch { settingsStore.setPlaybackSpeed(it) }; showSpeedDialog = false },
            onDismiss = { showSpeedDialog = false },
        )
    }
    if (showSkipDialog) {
        ChoiceDialog(
            title = if (isUrdu) ProfileStr.SKIP_UR else ProfileStr.SKIP_EN,
            options = listOf(10, 15, 30, 45).map { it to "${it}s" },
            selected = skip,
            isUrdu = isUrdu,
            onSelect = { scope.launch { settingsStore.setSkipInterval(it) }; showSkipDialog = false },
            onDismiss = { showSkipDialog = false },
        )
    }
}

private fun themeLabel(mode: SettingsStore.ThemeMode, ur: Boolean): String = when (mode) {
    SettingsStore.ThemeMode.SYSTEM -> if (ur) "سسٹم" else "System"
    SettingsStore.ThemeMode.LIGHT -> if (ur) "روشن" else "Light"
    SettingsStore.ThemeMode.DARK -> if (ur) "تاریک" else "Dark"
}

private fun speedLabel(s: Float): String =
    if (s == s.toInt().toFloat()) "${s.toInt()}×" else "${s}×"

@Composable
private fun <T> ChoiceDialog(
    title: String,
    options: List<Pair<T, String>>,
    selected: T,
    isUrdu: Boolean,
    onSelect: (T) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        title = {
            Text(title, fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
        },
        text = {
            Column {
                options.forEach { (value, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(value) }
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(
                            selected = value == selected,
                            onClick = { onSelect(value) },
                            colors = RadioButtonDefaults.colors(
                                selectedColor = MaterialTheme.colorScheme.tertiary,
                                unselectedColor = MaterialTheme.colorScheme.secondary,
                            ),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(label, fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                            fontSize = if (isUrdu) 16.sp else 14.sp,
                            color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(if (isUrdu) "بند کریں" else "Close", color = MaterialTheme.colorScheme.tertiary)
            }
        },
    )
}

@Composable
private fun SectionHeader(number: String, title: String, subtitle: String) {
    val gold = MaterialTheme.colorScheme.tertiary
    val ur = LocalIsUrdu.current
    Row(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            number,
            style = MaterialTheme.typography.labelSmall.copy(
                fontFamily = CrimsonProFontFamily,
                fontStyle = FontStyle.Italic,
                fontSize = 13.sp,
            ),
            color = gold.copy(alpha = 0.6f),
        )
        Text(
            " · ",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
            color = MaterialTheme.colorScheme.secondary,
        )
        Text(
            title,
            style = MaterialTheme.typography.labelSmall.copy(
                fontFamily = if (ur) NastaleeqFontFamily else null,
                fontWeight = FontWeight.Bold,
                letterSpacing = if (ur) 0.sp else 0.08.sp,
                fontSize = if (ur) 14.sp else 10.sp,
            ),
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.width(6.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodySmall.copy(
                fontFamily = if (ur) NastaleeqFontFamily else CrimsonProFontFamily,
                fontStyle = if (ur) FontStyle.Normal else FontStyle.Italic,
                fontSize = if (ur) 13.sp else 11.sp,
            ),
            color = MaterialTheme.colorScheme.secondary,
        )
    }
}

@Composable
private fun LanguageToggleRow(isUrdu: Boolean, onToggle: () -> Unit) {
    val gold = MaterialTheme.colorScheme.tertiary
    val card = MaterialTheme.colorScheme.surface
    // Always render this row LTR so the EN/اردو pill doesn't mirror
    androidx.compose.runtime.CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Ltr
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (isUrdu) ProfileStr.LANGUAGE_UR else ProfileStr.LANGUAGE_EN,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                    fontSize = if (isUrdu) 17.sp else 13.sp,
                ),
                color = MaterialTheme.colorScheme.onSurface,
            )
            // Pill toggle: EN | اردو
            Surface(
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.background,
                tonalElevation = 0.dp,
                modifier = Modifier.height(30.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxHeight().padding(2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    listOf("EN" to false, "اردو" to true).forEach { (label, isSelected) ->
                        val active = isSelected == isUrdu
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(50))
                                .background(if (active) gold else Color.Transparent)
                                .clickable { if (!active) onToggle() }
                                .padding(horizontal = 12.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontFamily = if (label == "اردو") NastaleeqFontFamily else null,
                                    fontSize = if (label == "اردو") 13.sp else 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = if (active) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.secondary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingRow(label: String, value: String, onClick: (() -> Unit)? = null) {
    val ur = LocalIsUrdu.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontFamily = if (ur) NastaleeqFontFamily else null,
                fontSize = if (ur) 17.sp else 13.sp,
            ),
            color = MaterialTheme.colorScheme.onSurface,
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                value,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                ),
                color = MaterialTheme.colorScheme.secondary,
            )
            Spacer(Modifier.width(4.dp))
            Icon(
                Icons.Outlined.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.size(14.dp),
            )
        }
    }
}

@Composable
private fun AboutRow(label: String, onClick: () -> Unit) {
    val ur = LocalIsUrdu.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontFamily = if (ur) NastaleeqFontFamily else null,
                fontSize = if (ur) 17.sp else 13.sp,
            ),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        Icon(
            Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.size(14.dp),
        )
    }
}

@Composable
private fun RowDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(horizontal = 16.dp),
        thickness = 0.5.dp,
        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
    )
}
