package com.ennbi.khanqah.ui.library

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ennbi.khanqah.data.db.entities.CategoryEntity
import com.ennbi.khanqah.ui.theme.NastaleeqFontFamily
import com.ennbi.khanqah.ui.utils.LocalIsUrdu

private fun tr(isUrdu: Boolean, en: String, ur: String) = if (isUrdu) ur else en

/** Filter icon for the right of a search bar; shows a small dot while a popup filter is on. */
@Composable
fun FilterIconButton(active: Boolean, tint: Color, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.size(40.dp).clip(CircleShape).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Outlined.Tune, contentDescription = "Filters", tint = tint, modifier = Modifier.size(22.dp))
        if (active) {
            Box(
                Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 8.dp)
                    .size(8.dp).background(Color(0xFFD64545), CircleShape),
            )
        }
    }
}

@Composable
fun FilterDialog(
    filter: ContentFilter,
    categories: List<CategoryEntity>,
    speakers: List<SpeakerOption>,
    onApply: (ContentFilter) -> Unit,
    onDismiss: () -> Unit,
) {
    val isUrdu = LocalIsUrdu.current
    var categoryId by remember { mutableStateOf(filter.categoryId) }
    var speakerKey by remember { mutableStateOf(filter.speakerKey) }
    val muted = MaterialTheme.colorScheme.secondary

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.padding(24.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        tr(isUrdu, "Filters", "فلٹرز"),
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold,
                            fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                        ),
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        Icons.Outlined.Close, contentDescription = "Close", tint = muted,
                        modifier = Modifier.size(24.dp).clip(CircleShape).clickable(onClick = onDismiss),
                    )
                }

                if (categories.size > 1) {
                    Spacer(Modifier.height(20.dp))
                    FilterDropdown(
                        label = tr(isUrdu, "CATEGORY", "زمرہ"),
                        placeholder = tr(isUrdu, "Select category", "زمرہ منتخب کریں"),
                        allLabel = tr(isUrdu, "All categories", "تمام زمرے"),
                        options = categories.map { it.id to (if (isUrdu && it.nameUr.isNotBlank()) it.nameUr else it.nameEn) },
                        selected = categoryId,
                        onSelect = { categoryId = it },
                    )
                }
                if (speakers.size > 1) {
                    Spacer(Modifier.height(16.dp))
                    FilterDropdown(
                        label = tr(isUrdu, "SPEAKER", "مقرر"),
                        placeholder = tr(isUrdu, "Select speaker", "مقرر منتخب کریں"),
                        allLabel = tr(isUrdu, "All speakers", "تمام مقررین"),
                        options = speakers.map { it.key to it.label },
                        selected = speakerKey,
                        onSelect = { speakerKey = it },
                    )
                }

                Spacer(Modifier.height(24.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = { onApply(filter.copy(categoryId = null, speakerKey = null)) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, muted.copy(alpha = 0.3f)),
                    ) { Text(tr(isUrdu, "Clear", "صاف کریں"), color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold) }
                    Button(
                        onClick = { onApply(filter.copy(categoryId = categoryId, speakerKey = speakerKey)) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    ) { Text(tr(isUrdu, "Apply", "لاگو کریں"), fontWeight = FontWeight.SemiBold) }
                }
            }
        }
    }
}

/** A dropdown that opens from a read-only field. Keys: null = no filter; options are key to label. */
@Composable
private fun FilterDropdown(
    label: String,
    placeholder: String,
    allLabel: String,
    options: List<Pair<String, String>>,
    selected: String?,
    onSelect: (String?) -> Unit,
) {
    val isUrdu = LocalIsUrdu.current
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first.equals(selected, ignoreCase = true) }?.second
    val fontFamily = if (isUrdu) NastaleeqFontFamily else null

    Text(label, style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 0.06.sp), color = MaterialTheme.colorScheme.secondary)
    Spacer(Modifier.height(6.dp))
    Box {
        OutlinedTextField(
            value = selectedLabel ?: "",
            onValueChange = {},
            readOnly = true,
            placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.secondary, fontFamily = fontFamily) },
            trailingIcon = { Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null) },
            textStyle = MaterialTheme.typography.bodyLarge.copy(fontFamily = fontFamily),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        // A text field swallows taps itself, so open the menu from an overlay on top of it.
        Box(
            Modifier.matchParentSize().clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { expanded = true },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text(allLabel, fontFamily = fontFamily) },
                onClick = { onSelect(null); expanded = false },
            )
            options.forEach { (key, text) ->
                DropdownMenuItem(
                    text = { Text(text, fontFamily = fontFamily) },
                    onClick = { onSelect(key); expanded = false },
                )
            }
        }
    }
}
