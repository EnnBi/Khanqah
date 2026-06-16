package com.khanqah.shaykh.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val AdminColorScheme = darkColorScheme(
    background            = AdminBackground,
    surface               = AdminSurface,
    surfaceVariant        = AdminSurfaceVar,
    primary               = AdminGold,
    onPrimary             = AdminOnGold,
    primaryContainer      = AdminGoldContainer,
    onPrimaryContainer    = AdminGold,
    secondary             = AdminCreamMuted,
    onSecondary           = AdminOnGold,
    tertiary              = AdminGold,
    onTertiary            = AdminOnGold,
    tertiaryContainer     = AdminGoldContainer,
    onTertiaryContainer   = AdminGold,
    onBackground          = AdminCream,
    onSurface             = AdminCream,
    onSurfaceVariant      = AdminCreamMuted,
    outline               = AdminBorder,
    error                 = AdminError,
    errorContainer        = AdminErrorContainer,
    onError               = AdminOnError,
    onErrorContainer      = AdminError,
)

@Composable
fun KhanqahTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = AdminBackground.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }
    MaterialTheme(colorScheme = AdminColorScheme, typography = Typography, content = content)
}
