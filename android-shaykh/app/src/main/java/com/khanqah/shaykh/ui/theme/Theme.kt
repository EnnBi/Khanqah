package com.khanqah.shaykh.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/** Custom audio/illumination tokens not covered by Material's color scheme. */
val LocalShaykhColors = staticCompositionLocalOf { DarkShaykhColors }

private fun materialScheme(c: ShaykhColors, dark: Boolean) = if (dark) darkColorScheme(
    background = c.bg1, surface = c.card, surfaceVariant = c.card2,
    primary = c.gold, onPrimary = c.onGold, primaryContainer = c.card2, onPrimaryContainer = c.gold,
    secondary = c.muted, onSecondary = c.onGold,
    tertiary = c.gold, onTertiary = c.onGold, tertiaryContainer = c.card2, onTertiaryContainer = c.gold,
    onBackground = c.text, onSurface = c.text, onSurfaceVariant = c.muted,
    outline = c.border, error = c.coral, errorContainer = c.errorContainer, onError = c.onError, onErrorContainer = c.coral,
) else lightColorScheme(
    background = c.bg1, surface = c.card, surfaceVariant = c.card2,
    primary = c.gold, onPrimary = c.onGold, primaryContainer = c.card2, onPrimaryContainer = c.goldDeep,
    secondary = c.muted, onSecondary = Color.White,
    tertiary = c.gold, onTertiary = c.onGold, tertiaryContainer = c.card2, onTertiaryContainer = c.goldDeep,
    onBackground = c.text, onSurface = c.text, onSurfaceVariant = c.muted,
    outline = c.border, error = c.coral, errorContainer = c.errorContainer, onError = c.onError, onErrorContainer = c.coral,
)

@Composable
fun KhanqahShaykhTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) DarkShaykhColors else LightShaykhColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colors.bg1.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    CompositionLocalProvider(LocalShaykhColors provides colors) {
        MaterialTheme(colorScheme = materialScheme(colors, darkTheme), typography = Typography, content = content)
    }
}
