package com.khanqah.admin.ui.team

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.User

private val ROLES = listOf("listener", "editor", "admin", "broadcaster")

@Composable
fun TeamScreen(users: List<User>, onRoleChange: (String, String) -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Text("Team", style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 16.dp))
        }
        if (users.isEmpty()) {
            item { Text("No users.", color = MaterialTheme.colorScheme.outline) }
        }
        items(users) { user ->
            var expanded by remember { mutableStateOf(false) }
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(user.displayName.ifBlank { user.phone },
                            style = MaterialTheme.typography.titleLarge)
                        Text(user.phone, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline)
                    }
                    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                        TextButton(onClick = { expanded = true }, modifier = Modifier.menuAnchor()) {
                            Text(user.role)
                        }
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            ROLES.forEach { role ->
                                DropdownMenuItem(text = { Text(role) }, onClick = {
                                    onRoleChange(user.id, role); expanded = false
                                })
                            }
                        }
                    }
                }
            }
        }
    }
}
