package com.khanqah.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private fun typeIconVector(type: String): ImageVector = when (type.lowercase().trim()) {
    "bayan"             -> Icons.Outlined.RecordVoiceOver
    "clip"              -> Icons.Outlined.PlayCircleOutline
    "book", "books"     -> Icons.AutoMirrored.Outlined.MenuBook
    "mamulat"           -> Icons.Outlined.SelfImprovement
    "quran"             -> Icons.Outlined.ImportContacts
    "naat", "hamd_naat", "nazam" -> Icons.Outlined.LibraryMusic
    "munajaat"                   -> Icons.Outlined.MusicNote
    "zikr"              -> Icons.Outlined.AllInclusive
    "majalis"           -> Icons.Outlined.Groups
    "live"              -> Icons.Outlined.LiveTv
    else                -> Icons.Outlined.Category
}

@Composable
fun TypeIconSquare(
    type: String,
    size: Dp = 56.dp,
    modifier: Modifier = Modifier,
) {
    val containerColor = MaterialTheme.colorScheme.tertiary
    val iconColor      = MaterialTheme.colorScheme.background
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape((size.value * 0.25f).dp))
            .background(containerColor),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = typeIconVector(type),
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(size * 0.50f),
        )
    }
}

@Composable
fun TypeBadge(type: String, modifier: Modifier = Modifier) {
    Text(
        text = type.uppercase(),
        modifier = modifier,
        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.05.sp),
        color = MaterialTheme.colorScheme.secondary,
    )
}

@Composable
fun SectionLabel(label: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.1.sp),
            color = MaterialTheme.colorScheme.tertiary,
        )
        Spacer(Modifier.width(10.dp))
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.25f),
        )
    }
}
