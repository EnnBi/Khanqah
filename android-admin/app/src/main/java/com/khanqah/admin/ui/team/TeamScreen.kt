package com.khanqah.admin.ui.team

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.khanqah.admin.data.model.User
import com.khanqah.admin.ui.theme.*

private val ROLES = listOf("listener", "editor", "admin", "broadcaster")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamScreen(
    users: List<User>,
    onRoleChange: (String, String) -> Unit,
    onDelete: (String) -> Unit,
    onNameChange: (String, String) -> Unit,
) {
    var confirmDeleteId by remember { mutableStateOf<String?>(null) }
    var editNameUser    by remember { mutableStateOf<User?>(null) }
    var editNameValue   by remember { mutableStateOf("") }

    confirmDeleteId?.let { id ->
        val user = users.find { it.id == id }
        AlertDialog(
            onDismissRequest = { confirmDeleteId = null },
            title = { Text("Remove member?", color = AdminCream) },
            text  = { Text("Remove ${user?.displayName?.ifBlank { user.phone } ?: id} from the team?", color = AdminCreamMuted) },
            confirmButton = {
                TextButton(onClick = { onDelete(id); confirmDeleteId = null }) {
                    Text("Remove", color = AdminError)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDeleteId = null }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }

    editNameUser?.let { user ->
        AlertDialog(
            onDismissRequest = { editNameUser = null },
            title = { Text("Edit name", color = AdminCream) },
            text  = {
                OutlinedTextField(
                    value = editNameValue, onValueChange = { editNameValue = it },
                    label = { Text("Display name") }, singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
                        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
                        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
                        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    if (editNameValue.isNotBlank()) onNameChange(user.id, editNameValue)
                    editNameUser = null
                }) { Text("Save", color = AdminGold) }
            },
            dismissButton = { TextButton(onClick = { editNameUser = null }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(AdminBackground).padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text("TEAM", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold), color = AdminGold, modifier = Modifier.padding(bottom = 8.dp))
        }
        if (users.isEmpty()) {
            item { Text("No users.", color = AdminCreamMuted) }
        }
        items(users, key = { it.id }) { user ->
            var roleExpanded by remember { mutableStateOf(false) }

            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminSurface)
                    .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            user.displayName.ifBlank { user.phone },
                            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                            color = AdminCream,
                        )
                        Text(user.phone, style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                    }
                    IconButton(onClick = { editNameUser = user; editNameValue = user.displayName }) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Edit name", tint = AdminGoldMuted, modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = { confirmDeleteId = user.id }) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = AdminError, modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.height(8.dp))
                ExposedDropdownMenuBox(expanded = roleExpanded, onExpandedChange = { roleExpanded = it }) {
                    OutlinedTextField(
                        value = user.role, onValueChange = {}, readOnly = true,
                        label = { Text("Role") },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(roleExpanded) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
                            focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
                            focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
                            focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
                        ),
                    )
                    ExposedDropdownMenu(expanded = roleExpanded, onDismissRequest = { roleExpanded = false },
                        modifier = Modifier.background(AdminSurface)) {
                        ROLES.forEach { role ->
                            DropdownMenuItem(text = { Text(role, color = AdminCream) },
                                onClick = { onRoleChange(user.id, role); roleExpanded = false })
                        }
                    }
                }
            }
        }
    }
}
