package com.khanqah.app.ui.profile

import androidx.compose.foundation.background
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.theme.CrimsonProFontFamily

@Composable
fun ProfileScreen(
    isLoggedIn: Boolean,
    displayName: String,
    phone: String,
    role: String?,
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
                        "Profile",
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        " & settings",
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
                        if (isLoggedIn && displayName.isNotBlank()) displayName else "Guest",
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        if (isLoggedIn) phone else "Not signed in",
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
                            "SIGN OUT",
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
                            "SIGN IN",
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
        SectionHeader(number = "01", title = "PREFERENCES", subtitle = "Personalise your experience")

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
                SettingRow("Language",      "ENGLISH")
                RowDivider()
                SettingRow("Appearance",    "DARK")
                RowDivider()
                SettingRow("Playback Speed","1.0×")
                RowDivider()
                SettingRow("Notifications", "On")
                RowDivider()
                SettingRow("Skip Interval", "15s")
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Section 02: About ──
        SectionHeader(number = "02", title = "ABOUT", subtitle = "Learn more about us")

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
                AboutRow("About the Khanqah")
                RowDivider()
                AboutRow("Hazrat Mufti Abdur Rasheed Miftahi Sahab's Bio")
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
