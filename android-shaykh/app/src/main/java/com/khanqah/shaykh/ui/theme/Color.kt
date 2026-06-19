package com.khanqah.shaykh.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Full token set for the Khanqah Hazrat UI, in light and dark. Standard slots are mapped into
 * the Material color scheme in [KhanqahShaykhTheme]; the extra audio/illumination tokens
 * (goldBright, ringTrack, waveOff, …) are exposed via LocalShaykhColors.
 */
data class ShaykhColors(
    val bg1: Color, val bg2: Color, val card: Color, val card2: Color,
    val gold: Color, val goldBright: Color, val goldDeep: Color,
    val text: Color, val muted: Color, val faint: Color,
    val border: Color, val coral: Color, val success: Color,
    val ringTrack: Color, val waveOff: Color, val onGold: Color,
    val errorContainer: Color, val onError: Color,
)

// ── Dark (primary) — deep emerald + gold ──
val DarkShaykhColors = ShaykhColors(
    bg1 = Color(0xFF04302C), bg2 = Color(0xFF02201D),
    card = Color(0xFF0B4A43), card2 = Color(0xFF0E544C),
    gold = Color(0xFFD4B06A), goldBright = Color(0xFFE8CD8E), goldDeep = Color(0xFFB8923F),
    text = Color(0xFFF5E9D0), muted = Color(0xFF9DB0A2), faint = Color(0xFF6E8278),
    border = Color(0xFF1A5248), coral = Color(0xFFE26D67), success = Color(0xFF7FCB9B),
    ringTrack = Color(0xFF0E3D37), waveOff = Color(0xFF27574E), onGold = Color(0xFF0B4A43),
    errorContainer = Color(0xFF3D1825), onError = Color(0xFFFAEBD7),
)

// ── Light — parchment + ink-green + gold ──
val LightShaykhColors = ShaykhColors(
    bg1 = Color(0xFFF2ECDD), bg2 = Color(0xFFE7DEC9),
    card = Color(0xFFFFFFFF), card2 = Color(0xFFFBF7EE),
    gold = Color(0xFFB8923F), goldBright = Color(0xFFC8A24A), goldDeep = Color(0xFF9A7B2E),
    text = Color(0xFF0C3A34), muted = Color(0xFF5E6F62), faint = Color(0xFF9AA89A),
    border = Color(0x210B4A43), coral = Color(0xFFC0544E), success = Color(0xFF2F7D4F),
    ringTrack = Color(0x1F0B4A43), waveOff = Color(0xFFD8CDB4), onGold = Color(0xFF0B4A43),
    errorContainer = Color(0xFFF6E3E1), onError = Color(0xFF5A1A1A),
)
