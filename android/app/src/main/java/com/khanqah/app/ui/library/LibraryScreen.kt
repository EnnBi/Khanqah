package com.khanqah.app.ui.library

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.ui.components.ContentRow
import com.khanqah.app.ui.components.TypeIconSquare
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LibraryStr
import com.khanqah.app.ui.utils.LocalIsUrdu

@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel,
    onCategoryClick: (CategoryEntity) -> Unit,
    onContentClick: (String) -> Unit = {},
) {
    val categories by viewModel.categories.collectAsState()
    val query by viewModel.searchQuery.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val focusRequester = remember { FocusRequester() }
    val isSearching = query.isNotBlank()
    val gold = MaterialTheme.colorScheme.tertiary
    val bg = MaterialTheme.colorScheme.background
    val isUrdu = LocalIsUrdu.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bg),
    ) {
        // ── Header ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(top = 16.dp, bottom = 12.dp),
        ) {
            if (isUrdu) {
                Text(
                    LibraryStr.TITLE_UR,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = gold.copy(alpha = 0.7f),
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    LibraryStr.TITLE_UR,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            } else {
                Text(
                    "THE COLLECTION",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.14.sp,
                    ),
                    color = gold.copy(alpha = 0.7f),
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontFamily = CrimsonProFontFamily, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground, fontSize = 28.sp)) { append("Browse ") }
                        withStyle(SpanStyle(fontFamily = CrimsonProFontFamily, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal, color = gold, fontSize = 28.sp)) { append("everything") }
                    },
                    style = MaterialTheme.typography.headlineLarge,
                )
            }

            Spacer(Modifier.height(10.dp))

            // Search bar
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { focusRequester.requestFocus() },
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, gold.copy(alpha = 0.18f)),
                tonalElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Search, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(9.dp))
                    Box(Modifier.weight(1f)) {
                        if (query.isEmpty()) {
                            Text(if (isUrdu) LibraryStr.SEARCH_UR else LibraryStr.SEARCH_EN, style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp), color = MaterialTheme.colorScheme.secondary)
                        }
                        BasicTextField(
                            value = query,
                            onValueChange = { viewModel.setSearchQuery(it) },
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface),
                            cursorBrush = SolidColor(gold),
                            modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            Text(
                if (isSearching) "${searchResults.size} ${if (isUrdu) LibraryStr.RESULTS_UR else LibraryStr.RESULTS_EN}"
                else "%02d · ${if (isUrdu) LibraryStr.CATEGORIES_UR else LibraryStr.CATEGORIES_EN}".format(categories.size),
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.08.sp),
                color = MaterialTheme.colorScheme.secondary,
            )
        }

        // ── Content: search results list OR category grid ──
        if (isSearching) {
            if (searchResults.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "No results for \"$query\"",
                        style = MaterialTheme.typography.bodyLarge.copy(fontStyle = FontStyle.Italic),
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            } else {
                LazyColumn(Modifier.fillMaxSize()) {
                    items(searchResults) { item ->
                        ContentRow(item = item, progress = null, onClick = { onContentClick(item.id) })
                    }
                }
            }
        } else {
            val rows = categories.chunked(2)
            Column(
                modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 14.dp).padding(bottom = 10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                rows.forEach { rowItems ->
                    Row(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        rowItems.forEach { cat ->
                            CategoryCard(cat = cat, onClick = { onCategoryClick(cat) }, modifier = Modifier.weight(1f).fillMaxHeight())
                        }
                        if (rowItems.size < 2) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryCard(cat: CategoryEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val gold = MaterialTheme.colorScheme.tertiary
    val isUrdu = LocalIsUrdu.current
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, gold.copy(alpha = 0.10f)),
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(14.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            TypeIconSquare(cat.type.ifBlank { "bayan" }, size = 46.dp)
            Spacer(Modifier.height(10.dp))
            if (isUrdu && cat.nameUr.isNotBlank()) {
                Text(
                    cat.nameUr,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            } else {
                Text(
                    cat.nameEn,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 17.sp),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (cat.type.isNotBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(cat.type.uppercase(), style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp, letterSpacing = 0.08.sp), color = MaterialTheme.colorScheme.secondary)
            }
        }
    }
}
