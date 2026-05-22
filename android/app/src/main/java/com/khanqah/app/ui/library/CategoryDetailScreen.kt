package com.khanqah.app.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.components.ContentRow
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun CategoryDetailScreen(
    viewModel: CategoryDetailViewModel,
    categoryNameEn: String,
    categoryNameUr: String,
    categoryType: String = "",
    onContentClick: (String) -> Unit,
    onBack: () -> Unit,
    showBackButton: Boolean = true,
) {
    val content by viewModel.content.collectAsState()
    val progressMap by viewModel.progressMap.collectAsState()
    var query by remember { mutableStateOf("") }
    val isDark = isSystemInDarkTheme()

    // Header bg: gold in dark, cream/off-white in light
    val headerBg = if (isDark) Color(0xFFD4A853) else Color(0xFFEEEAE0)
    val headerFg = if (isDark) Color(0xFF0F2E24) else Color(0xFF0F2E24)
    val headerMuted = if (isDark) Color(0xFF0F2E24).copy(alpha = 0.6f) else Color(0xFF5A6B60)
    val searchBg = if (isDark) Color(0xFF0F2E24).copy(alpha = 0.2f) else Color(0xFF0F2E24).copy(alpha = 0.08f)
    val searchHint = if (isDark) Color(0xFF0F2E24).copy(alpha = 0.5f) else Color(0xFF5A6B60)

    val filtered = if (query.isBlank()) content
                   else content.filter { it.titleEn.contains(query, ignoreCase = true) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // ── Gold / cream header zone ──
        Column(
            modifier = Modifier.fillMaxWidth().background(headerBg).padding(horizontal = 16.dp),
        ) {
            Spacer(Modifier.height(12.dp))
            if (showBackButton) {
                Row(
                    modifier = Modifier.clickable(onClick = onBack),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = headerFg,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "BACK",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, fontWeight = FontWeight.SemiBold),
                        color = headerFg,
                    )
                }
                Spacer(Modifier.height(12.dp))
            }

            // Breadcrumb
            if (categoryType.isNotBlank()) {
                Text(
                    categoryType.uppercase(),
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.08.sp),
                    color = headerMuted,
                )
                Spacer(Modifier.height(4.dp))
            }

            // Title
            Text(
                categoryNameEn,
                style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                color = headerFg,
            )

            // Urdu name
            if (categoryNameUr.isNotBlank()) {
                Text(
                    categoryNameUr,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 22.sp,
                    color = if (isDark) Color(0xFF0F2E24) else Color(0xFFD4A853),
                )
            }

            Spacer(Modifier.height(8.dp))

            // Item count
            Text(
                "${filtered.size} ITEMS",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.06.sp),
                color = headerMuted,
            )

            Spacer(Modifier.height(12.dp))

            // Search bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(searchBg, RoundedCornerShape(24.dp))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                if (query.isEmpty()) {
                    Text("Search title or credit…", color = searchHint, style = MaterialTheme.typography.bodyMedium)
                }
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = headerFg),
                    cursorBrush = SolidColor(headerFg),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(16.dp))
        }

        // ── Content list ──
        if (filtered.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (query.isBlank()) "No content available" else "No results for \"$query\"",
                    style = MaterialTheme.typography.bodyLarge.copy(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic),
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().weight(1f)) {
                items(filtered) { item ->
                    ContentRow(
                        item = item,
                        progress = progressMap[item.id],
                        onClick = { onContentClick(item.id) },
                    )
                }
            }
        }
    }
}
