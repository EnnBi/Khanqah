package com.khanqah.app.ui.library

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun LibraryScreen(viewModel: LibraryViewModel, onCategoryClick: (CategoryEntity) -> Unit) {
    val categories by viewModel.categories.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text(
                "Library",
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }

        if (categories.isEmpty()) {
            item {
                Box(
                    Modifier.fillParentMaxWidth().padding(top = 48.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
        }

        items(categories) { cat ->
            CategoryCard(cat = cat, onClick = { onCategoryClick(cat) })
        }
    }
}

@Composable
private fun CategoryCard(cat: CategoryEntity, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(cat.nameEn, style = MaterialTheme.typography.titleLarge)
                Text(
                    cat.nameUr,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.tertiary,
                    textAlign = TextAlign.Start,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
            )
        }
    }
}
