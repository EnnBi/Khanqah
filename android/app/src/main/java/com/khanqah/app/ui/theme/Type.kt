package com.khanqah.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.khanqah.app.R

val NastaleeqFontFamily = FontFamily(
    Font(R.font.jameel_noori_nastaleeq)
)

val Typography = Typography(
    headlineLarge  = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold, lineHeight = 36.sp),
    headlineMedium = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 30.sp),
    titleLarge     = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Medium,   lineHeight = 26.sp),
    bodyLarge      = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal,   lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal,   lineHeight = 20.sp),
    labelSmall     = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium,   lineHeight = 16.sp, letterSpacing = 0.8.sp),
)
