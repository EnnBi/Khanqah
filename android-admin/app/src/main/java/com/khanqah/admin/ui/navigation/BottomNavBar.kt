package com.khanqah.admin.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.List
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import com.khanqah.admin.ui.theme.*

@Composable
fun AdminBottomNavBar(currentRoute: String, onNavigate: (String) -> Unit) {
    NavigationBar(containerColor = AdminSurface) {
        listOf(
            Triple("home",     "Live",     Icons.Outlined.Mic),
            Triple("content",  "Content",  Icons.Outlined.List),
            Triple("schedule", "Schedule", Icons.Outlined.CalendarMonth),
            Triple("more",     "More",     Icons.Outlined.MoreHoriz),
        ).forEach { (route, label, icon) ->
            NavigationBarItem(
                selected = currentRoute == route,
                onClick  = { onNavigate(route) },
                icon     = { Icon(icon, contentDescription = label) },
                label    = { Text(label) },
                colors   = NavigationBarItemDefaults.colors(
                    selectedIconColor   = AdminGold,
                    selectedTextColor   = AdminGold,
                    unselectedIconColor = AdminCream.copy(alpha = 0.45f),
                    unselectedTextColor = AdminCream.copy(alpha = 0.45f),
                    indicatorColor      = AdminGold.copy(alpha = 0.15f),
                ),
            )
        }
    }
}
