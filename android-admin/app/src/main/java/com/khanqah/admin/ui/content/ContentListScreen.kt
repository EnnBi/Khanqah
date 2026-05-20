package com.khanqah.admin.ui.content

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.Content

@Composable
fun ContentListScreen(items: List<Content>, onDelete: (String) -> Unit, onUploadClick: () -> Unit) {
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = onUploadClick) { Text("+") }
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            item {
                Text("Content", style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 16.dp))
            }
            if (items.isEmpty()) {
                item { Text("No content yet.", color = MaterialTheme.colorScheme.outline) }
            }
            items(items) { item ->
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(item.titleEn, style = MaterialTheme.typography.titleLarge)
                            Text(item.type, style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline)
                        }
                        TextButton(onClick = { onDelete(item.id) }) {
                            Text("Delete", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}
