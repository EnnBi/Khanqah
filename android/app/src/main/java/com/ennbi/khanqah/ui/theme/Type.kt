package com.khanqah.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.khanqah.app.R

val NastaleeqFontFamily = FontFamily(
    Font(R.font.jameel_noori_nastaleeq)
)

val DmSansFontFamily = FontFamily(
    Font(R.font.dm_sans_regular, FontWeight.Normal),
    Font(R.font.dm_sans_medium, FontWeight.Medium),
    Font(R.font.dm_sans_semibold, FontWeight.SemiBold),
    Font(R.font.dm_sans_bold, FontWeight.Bold),
)

val CrimsonProFontFamily = FontFamily(
    Font(R.font.crimson_pro_regular, FontWeight.Normal),
    Font(R.font.crimson_pro_italic, FontWeight.Normal, FontStyle.Italic),
    Font(R.font.crimson_pro_semibold, FontWeight.SemiBold),
)

val Typography = Typography(
    displayLarge   = TextStyle(fontFamily = CrimsonProFontFamily, fontSize = 40.sp, fontWeight = FontWeight.Normal, lineHeight = 48.sp),
    displayMedium  = TextStyle(fontFamily = CrimsonProFontFamily, fontSize = 34.sp, fontWeight = FontWeight.Normal, lineHeight = 42.sp),
    headlineLarge  = TextStyle(fontFamily = DmSansFontFamily, fontSize = 28.sp, fontWeight = FontWeight.Bold,    lineHeight = 36.sp),
    headlineMedium = TextStyle(fontFamily = DmSansFontFamily, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 30.sp),
    titleLarge     = TextStyle(fontFamily = DmSansFontFamily, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, lineHeight = 26.sp),
    titleMedium    = TextStyle(fontFamily = DmSansFontFamily, fontSize = 16.sp, fontWeight = FontWeight.Medium,   lineHeight = 24.sp),
    bodyLarge      = TextStyle(fontFamily = DmSansFontFamily, fontSize = 16.sp, fontWeight = FontWeight.Normal,   lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontFamily = DmSansFontFamily, fontSize = 14.sp, fontWeight = FontWeight.Normal,   lineHeight = 20.sp),
    bodySmall      = TextStyle(fontFamily = DmSansFontFamily, fontSize = 12.sp, fontWeight = FontWeight.Normal,   lineHeight = 18.sp),
    labelLarge     = TextStyle(fontFamily = DmSansFontFamily, fontSize = 14.sp, fontWeight = FontWeight.Medium,   lineHeight = 20.sp),
    labelMedium    = TextStyle(fontFamily = DmSansFontFamily, fontSize = 12.sp, fontWeight = FontWeight.Medium,   lineHeight = 16.sp),
    labelSmall     = TextStyle(fontFamily = DmSansFontFamily, fontSize = 11.sp, fontWeight = FontWeight.Medium,   lineHeight = 16.sp, letterSpacing = 0.8.sp),
)
