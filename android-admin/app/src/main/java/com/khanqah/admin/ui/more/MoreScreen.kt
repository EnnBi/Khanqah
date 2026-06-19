package com.khanqah.admin.ui.more

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.ui.theme.*

@Composable
fun MoreScreen(
    onNavigateTeam: () -> Unit,
    onNavigateCategories: () -> Unit,
    onNavigateBugs: () -> Unit,
    onNavigateSettings: () -> Unit,
    onLogout: () -> Unit,
) {
    var showLogout by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AdminBackground)
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            "MORE",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold),
            color = AdminGold,
        )
        Spacer(Modifier.height(20.dp))

        MoreNavCard(icon = Icons.Outlined.Group,     title = "Team",         sub = "Manage roles and members",      onClick = onNavigateTeam)
        Spacer(Modifier.height(8.dp))
        MoreNavCard(icon = Icons.Outlined.Category,  title = "Categories",   sub = "Create and rename categories",  onClick = onNavigateCategories)
        Spacer(Modifier.height(8.dp))
        MoreNavCard(icon = Icons.Outlined.BugReport, title = "Bug Reports",  sub = "View reports from users",       onClick = onNavigateBugs)
        Spacer(Modifier.height(8.dp))
        MoreNavCard(icon = Icons.Outlined.Notifications, title = "Settings", sub = "Push notification controls",     onClick = onNavigateSettings)

        Spacer(Modifier.weight(1f))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(AdminSurface)
                .border(1.dp, AdminCoral.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                .clickable { showLogout = true }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = AdminCoral, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(14.dp))
            Text("Log out", style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold), color = AdminCoral)
        }
        Spacer(Modifier.height(20.dp))
    }

    if (showLogout) {
        AlertDialog(
            onDismissRequest = { showLogout = false },
            containerColor = AdminSurface,
            title = { Text("Log out?", color = AdminCream, fontWeight = FontWeight.SemiBold) },
            text = { Text("You'll need to sign in again.", color = AdminCreamMuted) },
            confirmButton = {
                TextButton(onClick = { showLogout = false; onLogout() }) {
                    Text("Log out", color = AdminCoral, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogout = false }) { Text("Cancel", color = AdminCreamMuted) }
            },
        )
    }
}

@Composable
private fun MoreNavCard(icon: ImageVector, title: String, sub: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(AdminSurface)
            .border(1.dp, AdminBorder, RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = AdminGold, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold), color = AdminCream)
            Text(sub, style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
        }
        Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = AdminCreamMuted)
    }
}
