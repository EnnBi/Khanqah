package com.khanqah.shaykh.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

private data class Country(val flag: String, val name: String, val dial: String)

private val COUNTRIES = listOf(
    Country("🇮🇳", "India",          "91"),
    Country("🇵🇰", "Pakistan",       "92"),
    Country("🇧🇩", "Bangladesh",     "880"),
    Country("🇦🇪", "UAE",            "971"),
    Country("🇸🇦", "Saudi Arabia",   "966"),
    Country("🇶🇦", "Qatar",          "974"),
    Country("🇰🇼", "Kuwait",         "965"),
    Country("🇧🇭", "Bahrain",        "973"),
    Country("🇴🇲", "Oman",           "968"),
    Country("🇬🇧", "United Kingdom", "44"),
    Country("🇺🇸", "United States",  "1"),
    Country("🇨🇦", "Canada",         "1"),
    Country("🇦🇺", "Australia",      "61"),
    Country("🇿🇦", "South Africa",   "27"),
    Country("🇩🇪", "Germany",        "49"),
    Country("🇫🇷", "France",         "33"),
    Country("🇲🇾", "Malaysia",       "60"),
    Country("🇸🇬", "Singapore",      "65"),
    Country("🇳🇿", "New Zealand",    "64"),
)

@Composable
fun PhoneInputField(
    value: String,
    onValueChange: (e164: String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    var country  by remember { mutableStateOf(COUNTRIES[0]) }
    var local    by remember { mutableStateOf("") }
    var focused  by remember { mutableStateOf(false) }
    var showPicker by remember { mutableStateOf(false) }

    LaunchedEffect(country, local) {
        val digits = local.filter(Char::isDigit)
        onValueChange(if (digits.isNotBlank()) "+${country.dial}$digits" else "")
    }

    val borderColor = if (focused) MaterialTheme.colorScheme.primary
                      else MaterialTheme.colorScheme.outline

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .border(1.dp, borderColor, RoundedCornerShape(8.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Country dial code button
        Row(
            modifier = Modifier
                .clickable(enabled = enabled) { showPicker = true }
                .padding(horizontal = 12.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(country.flag, fontSize = 18.sp)
            Text(
                "+${country.dial}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text("▾", fontSize = 9.sp, color = MaterialTheme.colorScheme.secondary)
        }

        // Divider
        Box(
            Modifier
                .width(1.dp)
                .height(24.dp)
                .background(MaterialTheme.colorScheme.outline)
        )

        // Number input
        BasicTextField(
            value = local,
            onValueChange = { new ->
                local = new.filter { it.isDigit() || it == ' ' }
            },
            enabled = enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            textStyle = MaterialTheme.typography.bodyLarge.copy(
                color = MaterialTheme.colorScheme.onSurface,
            ),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp, vertical = 14.dp)
                .onFocusChanged { focused = it.isFocused },
            decorationBox = { inner ->
                if (local.isEmpty()) {
                    Text(
                        "98765 43210",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.6f),
                    )
                }
                inner()
            },
        )
    }

    if (showPicker) {
        CountryPickerDialog(
            current = country,
            onSelect = { country = it; showPicker = false },
            onDismiss = { showPicker = false },
        )
    }
}

@Composable
private fun CountryPickerDialog(
    current: Country,
    onSelect: (Country) -> Unit,
    onDismiss: () -> Unit,
) {
    var search by remember { mutableStateOf("") }
    val filtered = remember(search) {
        if (search.isBlank()) COUNTRIES
        else COUNTRIES.filter {
            it.name.contains(search, ignoreCase = true) || it.dial.contains(search)
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 4.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Select country",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 12.dp),
                )
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    placeholder = { Text("Search…") },
                    leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(18.dp)) },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.heightIn(max = 360.dp)) {
                    items(filtered) { c ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    if (c == current) MaterialTheme.colorScheme.primaryContainer
                                    else androidx.compose.ui.graphics.Color.Transparent
                                )
                                .clickable { onSelect(c) }
                                .padding(horizontal = 8.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Text(c.flag, fontSize = 20.sp)
                            Text(c.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                            Text("+${c.dial}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                    if (filtered.isEmpty()) {
                        item {
                            Text(
                                "No results",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.padding(12.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
