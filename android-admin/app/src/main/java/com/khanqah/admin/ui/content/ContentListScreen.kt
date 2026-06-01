package com.khanqah.admin.ui.content

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.Content
import com.khanqah.admin.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentListScreen(
    items: List<Content>,
    categories: List<Category>,
    onDelete: (String) -> Unit,
    onUpdate: (id: String, titleEn: String, titleUr: String, categoryId: String) -> Unit,
    onUploadClick: () -> Unit,
) {
    var expandedId     by remember { mutableStateOf<String?>(null) }
    var editTitleEn    by remember { mutableStateOf("") }
    var editTitleUr    by remember { mutableStateOf("") }
    var editCategoryId by remember { mutableStateOf("") }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor   = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor      = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor       = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor        = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

    Scaffold(
        containerColor = AdminBackground,
        floatingActionButton = {
            FloatingActionButton(onClick = onUploadClick, containerColor = AdminGold, contentColor = AdminOnGold) {
                Icon(Icons.Outlined.Add, contentDescription = "Upload")
            }
        },
    ) { padding ->
        LazyColumn(
            modifier        = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            contentPadding  = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text(
                    "CONTENT",
                    style    = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold),
                    color    = AdminGold,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
            if (items.isEmpty()) {
                item { Text("No content yet.", color = AdminCreamMuted) }
            }
            items(items, key = { it.id }) { item ->
                val isExpanded   = expandedId == item.id
                val categoryName = categories.find { it.id == item.categoryId }?.nameEn ?: item.categoryId

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(AdminSurface)
                        .border(1.dp, if (isExpanded) AdminGold.copy(alpha = 0.6f) else AdminBorder, RoundedCornerShape(12.dp)),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (isExpanded) {
                                    expandedId = null
                                } else {
                                    expandedId     = item.id
                                    editTitleEn    = item.titleEn
                                    editTitleUr    = item.titleUr
                                    editCategoryId = item.categoryId
                                }
                            }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(item.titleEn, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = AdminCream)
                            Text("$categoryName · ${item.type}", style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                        }
                        Icon(
                            if (isExpanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                            contentDescription = null, tint = AdminCreamMuted,
                        )
                    }

                    if (isExpanded) {
                        HorizontalDivider(color = AdminBorder, thickness = 0.5.dp)
                        Column(Modifier.padding(14.dp)) {
                            OutlinedTextField(
                                value = editTitleEn, onValueChange = { editTitleEn = it },
                                label = { Text("Title (English)") }, singleLine = true,
                                modifier = Modifier.fillMaxWidth(), colors = fieldColors,
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = editTitleUr, onValueChange = { editTitleUr = it },
                                label = { Text("عنوان (اردو)") }, singleLine = true,
                                modifier = Modifier.fillMaxWidth(), colors = fieldColors,
                            )
                            Spacer(Modifier.height(8.dp))
                            var catExpanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(expanded = catExpanded, onExpandedChange = { catExpanded = it }) {
                                OutlinedTextField(
                                    value = categories.find { it.id == editCategoryId }?.nameEn ?: "",
                                    onValueChange = {}, readOnly = true, label = { Text("Category") },
                                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(catExpanded) },
                                    colors = fieldColors,
                                )
                                ExposedDropdownMenu(expanded = catExpanded, onDismissRequest = { catExpanded = false },
                                    modifier = Modifier.background(AdminSurface)) {
                                    categories.forEach { c ->
                                        DropdownMenuItem(
                                            text    = { Text(c.nameEn, color = AdminCream) },
                                            onClick = { editCategoryId = c.id; catExpanded = false },
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick  = { onDelete(item.id); expandedId = null },
                                    modifier = Modifier.weight(1f),
                                    border   = androidx.compose.foundation.BorderStroke(1.dp, AdminCoral),
                                ) { Text("Delete", color = AdminCoral) }
                                Button(
                                    onClick  = { onUpdate(item.id, editTitleEn, editTitleUr, editCategoryId); expandedId = null },
                                    modifier = Modifier.weight(1f),
                                    colors   = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
                                ) { Text("Save", fontWeight = FontWeight.SemiBold) }
                            }
                        }
                    }
                }
            }
        }
    }
}
