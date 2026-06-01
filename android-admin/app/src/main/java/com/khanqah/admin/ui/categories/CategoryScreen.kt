package com.khanqah.admin.ui.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.ui.theme.*

@Composable
fun CategoryScreen(
    categories: List<Category>,
    onCreate: (nameEn: String, nameUr: String) -> Unit,
    onUpdate: (id: String, nameEn: String, nameUr: String) -> Unit,
    onDelete: (id: String) -> Unit,
) {
    var newEn         by remember { mutableStateOf("") }
    var newUr         by remember { mutableStateOf("") }
    var editingId     by remember { mutableStateOf<String?>(null) }
    var editEn        by remember { mutableStateOf("") }
    var editUr        by remember { mutableStateOf("") }
    var confirmDelete by remember { mutableStateOf<Category?>(null) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

    confirmDelete?.let { cat ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete category?", color = AdminCream) },
            text  = { Text("Delete \"${cat.nameEn}\"? This cannot be undone.", color = AdminCreamMuted) },
            confirmButton = {
                TextButton(onClick = { onDelete(cat.id); confirmDelete = null }) {
                    Text("Delete", color = AdminError)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(AdminBackground).padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text("CATEGORIES", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold), color = AdminGold, modifier = Modifier.padding(bottom = 8.dp))
        }

        item {
            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminSurface)
                    .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp),
            ) {
                Text("NEW CATEGORY", style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp), color = AdminGold, modifier = Modifier.padding(bottom = 10.dp))
                OutlinedTextField(value = newEn, onValueChange = { newEn = it }, label = { Text("Name (English)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = newUr, onValueChange = { newUr = it }, label = { Text("نام (اردو)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        if (newEn.isNotBlank() && newUr.isNotBlank()) {
                            onCreate(newEn, newUr); newEn = ""; newUr = ""
                        }
                    },
                    enabled = newEn.isNotBlank() && newUr.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
                ) { Text("Create Category", fontWeight = FontWeight.SemiBold) }
            }
        }

        if (categories.isEmpty()) {
            item { Text("No categories yet.", color = AdminCreamMuted) }
        }

        items(categories, key = { it.id }) { cat ->
            val isSystem = cat.slug != null
            val isEditing = editingId == cat.id

            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminSurface)
                    .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp),
            ) {
                if (isEditing) {
                    OutlinedTextField(value = editEn, onValueChange = { editEn = it }, label = { Text("Name (English)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = editUr, onValueChange = { editUr = it }, label = { Text("نام (اردو)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { editingId = null }, modifier = Modifier.weight(1f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AdminBorder)) {
                            Icon(Icons.Outlined.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Cancel", color = AdminCreamMuted)
                        }
                        Button(
                            onClick = {
                                if (editEn.isNotBlank() && editUr.isNotBlank()) {
                                    onUpdate(cat.id, editEn, editUr); editingId = null
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
                        ) {
                            Icon(Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Save", fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(cat.nameEn, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = AdminCream)
                                if (isSystem) {
                                    Surface(shape = RoundedCornerShape(4.dp), color = AdminGold.copy(alpha = 0.12f),
                                        border = androidx.compose.foundation.BorderStroke(0.5.dp, AdminGold.copy(alpha = 0.45f))) {
                                        Text("system", modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp), color = AdminGold)
                                    }
                                }
                            }
                            Text(cat.nameUr, style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                        }
                        IconButton(onClick = { editingId = cat.id; editEn = cat.nameEn; editUr = cat.nameUr }) {
                            Icon(Icons.Outlined.Edit, contentDescription = "Rename", tint = AdminGoldMuted, modifier = Modifier.size(18.dp))
                        }
                        if (!isSystem) {
                            IconButton(onClick = { confirmDelete = cat }) {
                                Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = AdminError, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
