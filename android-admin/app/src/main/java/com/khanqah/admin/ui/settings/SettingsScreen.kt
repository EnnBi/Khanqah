package com.khanqah.admin.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.NotificationSetting
import com.khanqah.admin.ui.theme.*

private data class SettingLabel(val title: String, val description: String)

private val LABELS = mapOf(
    "broadcast_live" to SettingLabel("Broadcast notifications", "Notify all users when a live session starts"),
    "content_upload" to SettingLabel("Content upload notifications", "Notify all users when new content is published"),
)

@Composable
fun SettingsScreen(
    settings: List<NotificationSetting>,
    onToggle: (key: String, enabled: Boolean) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AdminBackground)
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            "SETTINGS",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold),
            color = AdminGold,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Manage push notifications for the Khanqah app.",
            style = MaterialTheme.typography.bodySmall,
            color = AdminCreamMuted,
        )
        Spacer(Modifier.height(20.dp))

        Text(
            "PUSH NOTIFICATIONS",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.16.sp, fontWeight = FontWeight.Bold),
            color = AdminGold.copy(alpha = 0.7f),
        )
        Spacer(Modifier.height(12.dp))

        if (settings.isEmpty()) {
            Text("No settings available", style = MaterialTheme.typography.bodyMedium, color = AdminCreamMuted)
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                settings.forEach { setting ->
                    val label = LABELS[setting.key] ?: SettingLabel(setting.key, "")
                    SettingRow(
                        title       = label.title,
                        description = label.description,
                        enabled     = setting.enabled,
                        onToggle    = { onToggle(setting.key, it) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingRow(title: String, description: String, enabled: Boolean, onToggle: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AdminSurface)
            .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = AdminCream)
            if (description.isNotBlank()) {
                Text(description, style = MaterialTheme.typography.bodySmall, color = AdminCream.copy(alpha = 0.48f))
            }
        }
        Spacer(Modifier.width(12.dp))
        Switch(
            checked         = enabled,
            onCheckedChange = onToggle,
            colors          = SwitchDefaults.colors(checkedTrackColor = AdminGold, checkedThumbColor = AdminBackground),
        )
    }
}
