package com.khanqah.shaykh.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import com.khanqah.shaykh.R

val NastaleeqFontFamily = FontFamily(Font(R.font.jameel_noori_nastaleeq))

private fun nastaleeq(size: Int, line: Int) =
    TextStyle(fontFamily = NastaleeqFontFamily, fontSize = size.sp, lineHeight = line.sp)

val Typography = Typography(
    displayLarge  = nastaleeq(40, 64), displayMedium  = nastaleeq(34, 56),
    headlineLarge = nastaleeq(30, 52), headlineMedium = nastaleeq(26, 46),
    titleLarge    = nastaleeq(24, 44), titleMedium    = nastaleeq(20, 38),
    bodyLarge     = nastaleeq(20, 40), bodyMedium     = nastaleeq(18, 36), bodySmall = nastaleeq(15, 30),
    labelLarge    = nastaleeq(18, 34), labelMedium    = nastaleeq(16, 30), labelSmall = nastaleeq(14, 28),
)
