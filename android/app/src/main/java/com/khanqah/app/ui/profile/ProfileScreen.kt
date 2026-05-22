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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.utils.ProfileStr

@Composable
fun ProfileScreen(
    isLoggedIn: Boolean,
    displayName: String,
    phone: String,
    role: String?,
    isUrdu: Boolean,
    onLanguageToggle: () -> Unit,
    onLoginClick: () -> Unit,
    onLogout: () -> Unit,
) {
    val gold = MaterialTheme.colorScheme.tertiary
    val bg = MaterialTheme.colorScheme.background
    val card = MaterialTheme.colorScheme.surface
    val heroBg = MaterialTheme.colorScheme.primary

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
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        " ${if (isUrdu) ProfileStr.SETTINGS_UR else ProfileStr.SETTINGS_EN}",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontFamily = CrimsonProFontFamily,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.Normal,
                            fontSize = 22.sp,
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
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        if (isLoggedIn) phone else if (isUrdu) ProfileStr.NOT_SIGNED_UR else ProfileStr.NOT_SIGNED_EN,
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
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
                                fontSize = 9.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 0.06.sp,
                            ),
                        )
                    }
                } else {
                    Button(
                        onClick = onLoginClick,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = gold.copy(alpha = 0.15f),
                            contentColor = gold,
                        ),
                        elevation = ButtonDefaults.buttonElevation(0.dp),
                    ) {
                        Text(
                            if (isUrdu) ProfileStr.SIGN_IN_UR else ProfileStr.SIGN_IN_EN,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 9.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 0.06.sp,
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
                SettingRow(if (isUrdu) ProfileStr.APPEARANCE_UR  else ProfileStr.APPEARANCE_EN,  "DARK")
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.SPEED_UR       else ProfileStr.SPEED_EN,       "1.0×")
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.NOTIF_UR       else ProfileStr.NOTIF_EN,       "On")
                RowDivider()
                SettingRow(if (isUrdu) ProfileStr.SKIP_UR        else ProfileStr.SKIP_EN,        "15s")
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
                AboutRow(if (isUrdu) ProfileStr.ABOUT_UR else ProfileStr.ABOUT_EN)
                RowDivider()
                AboutRow(if (isUrdu) ProfileStr.BIO_UR else ProfileStr.BIO_EN)
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun SectionHeader(number: String, title: String, subtitle: String) {
    val gold = MaterialTheme.colorScheme.tertiary
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
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.08.sp,
                fontSize = 10.sp,
            ),
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.width(6.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodySmall.copy(
                fontFamily = CrimsonProFontFamily,
                fontStyle = FontStyle.Italic,
                fontSize = 11.sp,
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
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp),
                color = MaterialTheme.colorScheme.onSurface,
            )
            // Pill toggle: EN | اردو
            Surface(
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.background,
                tonalElevation = 0.dp,
                modifier = Modifier.height(30.dp),
            ) {
                Row(modifier = Modifier.padding(2.dp)) {
                    listOf("EN" to false, "اردو" to true).forEach { (label, isSelected) ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(if (isSelected == isUrdu) gold else Color.Transparent)
                                .clickable { if (isSelected != isUrdu) onToggle() }
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = if (isSelected == isUrdu) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.secondary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingRow(label: String, value: String) {
    val gold = MaterialTheme.colorScheme.tertiary
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp),
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
private fun AboutRow(label: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp),
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
