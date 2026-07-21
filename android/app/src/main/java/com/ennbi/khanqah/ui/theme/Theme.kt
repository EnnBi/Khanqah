package com.khanqah.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary             = PrimaryLight,
    onPrimary           = OnPrimaryLight,
    secondary           = SecondaryLight,
    onSecondary         = Color.White,
    background          = BackgroundLight,
    surface             = SurfaceLight,
    onBackground        = OnSurfaceLight,
    onSurface           = OnSurfaceLight,
    outline             = BorderLight,
    tertiary            = GoldLight,
    onTertiary          = BackgroundLight,
    tertiaryContainer   = GoldSurfaceLight,
    onTertiaryContainer = PrimaryLight,
)

private val DarkColors = darkColorScheme(
    primary             = EmeraldBg2,      // secondary bg — hero card / primary container
    onPrimary           = GoldPrimary,     // #C8A24A on hero surfaces
    secondary           = TextDisabled,    // #8FA39A muted text
    onSecondary         = EmeraldBg1,
    background          = EmeraldBg1,      // #0B2F27
    surface             = EmeraldCard1,    // #144236 card surfaces
    onBackground        = TextPrimary,     // #F5F3EE off-white
    onSurface           = TextPrimary,     // white text on cards
    outline             = EmeraldDivider,  // #2A5A48
    tertiary            = GoldRich,        // #D4AF37 active gold accent
    onTertiary          = EmeraldBg1,
    tertiaryContainer   = EmeraldIconBg,   // #1E5A48 icon tile bg
    onTertiaryContainer = GoldPrimary,     // #C8A24A icon color on tile
)

@Composable
fun KhanqahTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colors.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    MaterialTheme(colorScheme = colors, typography = Typography, content = content)
}
