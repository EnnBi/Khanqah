package com.khanqah.app.ui.library

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.components.ContentRow
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryDetailScreen(
    viewModel: CategoryDetailViewModel,
    categoryNameEn: String,
    categoryNameUr: String,
    onContentClick: (String) -> Unit,
    onBack: () -> Unit,
) {
    val content by viewModel.content.collectAsState()
    val progressMap by viewModel.progressMap.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(categoryNameEn, style = MaterialTheme.typography.titleLarge)
                        Text(
                            categoryNameUr,
                            fontFamily = NastaleeqFontFamily,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.tertiary,
                            textAlign = TextAlign.Start,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        }
    ) { padding ->
        if (content.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            ) {
                items(content) { item ->
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
