package com.khanqah.admin.ui.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.ui.theme.*
import java.time.Instant
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

private val FREQUENCIES = listOf("once", "daily", "weekly", "monthly")

private fun freqToRule(freq: String): String? = when (freq) {
    "daily"   -> "FREQ=DAILY"
    "weekly"  -> "FREQ=WEEKLY"
    "monthly" -> "FREQ=MONTHLY"
    else      -> null
}

private fun ruleToFreq(rule: String?): String = when {
    rule == null               -> "once"
    rule.contains("DAILY")    -> "daily"
    rule.contains("WEEKLY")   -> "weekly"
    rule.contains("MONTHLY")  -> "monthly"
    else                      -> "once"
}

private fun buildScheduledAt(dateMs: Long, hour: Int, minute: Int): String {
    val date = Instant.ofEpochMilli(dateMs).atZone(ZoneId.systemDefault()).toLocalDate()
    return date.atTime(hour, minute).atZone(ZoneId.systemDefault()).toInstant().toString()
}

private fun formatSessionDate(scheduledAt: String): String = try {
    val zdt = Instant.parse(scheduledAt).atZone(ZoneId.systemDefault())
    val h12 = if (zdt.hour % 12 == 0) 12 else zdt.hour % 12
    val period = if (zdt.hour < 12) "AM" else "PM"
    "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${zdt.year}  ·  $h12:%02d $period".format(zdt.minute)
} catch (_: Exception) { scheduledAt }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    sessions: List<ScheduledSession>,
    onCreate: (titleEn: String, titleUr: String, scheduledAt: String, isRecurring: Boolean, recurrenceRule: String?) -> Unit,
    onUpdate: (id: String, titleEn: String, titleUr: String, scheduledAt: String, isRecurring: Boolean, recurrenceRule: String?) -> Unit,
    onDelete: (String) -> Unit,
) {
    var showCreateForm by remember { mutableStateOf(false) }
    var expandedId     by remember { mutableStateOf<String?>(null) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

    Scaffold(
        containerColor = AdminBackground,
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateForm = !showCreateForm }, containerColor = AdminGold, contentColor = AdminOnGold) {
                Icon(if (showCreateForm) Icons.Outlined.Close else Icons.Outlined.Add, contentDescription = null)
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text("SCHEDULE", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold), color = AdminGold, modifier = Modifier.padding(bottom = 8.dp))
            }

            if (showCreateForm) {
                item {
                    SessionForm(
                        title    = "New Session",
                        fieldColors = fieldColors,
                        onSubmit = { en, ur, at, recurring, rule ->
                            onCreate(en, ur, at, recurring, rule)
                            showCreateForm = false
                        },
                        onCancel = { showCreateForm = false },
                    )
                }
            }

            if (sessions.isEmpty()) {
                item { Text("No sessions scheduled.", color = AdminCreamMuted) }
            }

            items(sessions, key = { it.id }) { s ->
                val isExpanded = expandedId == s.id
                val freqLabel = when {
                    !s.isRecurring                             -> "Once"
                    s.recurrenceRule?.contains("DAILY") == true  -> "Daily"
                    s.recurrenceRule?.contains("WEEKLY") == true -> "Weekly"
                    s.recurrenceRule?.contains("MONTHLY") == true -> "Monthly"
                    else                                         -> "Recurring"
                }

                Column(
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(AdminSurface)
                        .border(1.dp, if (isExpanded) AdminGold.copy(alpha = 0.6f) else AdminBorder, RoundedCornerShape(12.dp)),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clickable {
                                expandedId = if (isExpanded) null else s.id
                            }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(s.titleEn, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = AdminCream)
                            Text("${formatSessionDate(s.scheduledAt)}  ·  $freqLabel", style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                        }
                        Icon(if (isExpanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, contentDescription = null, tint = AdminCreamMuted)
                    }

                    if (isExpanded) {
                        HorizontalDivider(color = AdminBorder, thickness = 0.5.dp)
                        SessionForm(
                            title       = "Edit Session",
                            fieldColors = fieldColors,
                            initialEn   = s.titleEn,
                            initialUr   = s.titleUr,
                            initialScheduledAt = s.scheduledAt,
                            initialFreq = ruleToFreq(s.recurrenceRule),
                            onSubmit    = { en, ur, at, recurring, rule ->
                                onUpdate(s.id, en, ur, at, recurring, rule)
                                expandedId = null
                            },
                            onDelete = { onDelete(s.id); expandedId = null },
                            onCancel = { expandedId = null },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SessionForm(
    title: String,
    fieldColors: TextFieldColors,
    initialEn: String = "",
    initialUr: String = "",
    initialScheduledAt: String = "",
    initialFreq: String = "once",
    onSubmit: (titleEn: String, titleUr: String, scheduledAt: String, isRecurring: Boolean, recurrenceRule: String?) -> Unit,
    onDelete: (() -> Unit)? = null,
    onCancel: () -> Unit,
) {
    var titleEn  by remember { mutableStateOf(initialEn) }
    var titleUr  by remember { mutableStateOf(initialUr) }
    var freq     by remember { mutableStateOf(initialFreq) }

    val initMs = remember(initialScheduledAt) {
        runCatching { Instant.parse(initialScheduledAt).toEpochMilli() }.getOrNull()
    }
    val initZdt = remember(initMs) {
        initMs?.let { Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()) }
    }

    var selectedDateMs by remember { mutableStateOf(initMs) }
    var selectedHour   by remember { mutableIntStateOf(initZdt?.hour ?: 20) }
    var selectedMinute by remember { mutableIntStateOf(initZdt?.minute ?: 0) }

    Column(Modifier.padding(14.dp)) {
        Text(title, style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp), color = AdminGold, modifier = Modifier.padding(bottom = 10.dp))

        OutlinedTextField(value = titleEn, onValueChange = { titleEn = it }, label = { Text("Title (English)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = titleUr, onValueChange = { titleUr = it }, label = { Text("عنوان (اردو)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
        Spacer(Modifier.height(8.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DatePickerField(
                modifier     = Modifier.weight(1f),
                label        = "Date",
                selectedMs   = selectedDateMs,
                fieldColors  = fieldColors,
                onDateSelected = { selectedDateMs = it },
            )
            TimePickerField(
                modifier    = Modifier.weight(1f),
                label       = "Time",
                hour        = selectedHour,
                minute      = selectedMinute,
                fieldColors = fieldColors,
                onTimeSelected = { h, m -> selectedHour = h; selectedMinute = m },
            )
        }

        Spacer(Modifier.height(8.dp))

        var freqExpanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(expanded = freqExpanded, onExpandedChange = { freqExpanded = it }) {
            OutlinedTextField(
                value = freq.replaceFirstChar { it.uppercase() },
                onValueChange = {}, readOnly = true, label = { Text("Frequency") },
                modifier = Modifier.fillMaxWidth().menuAnchor(),
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(freqExpanded) },
                colors = fieldColors,
            )
            ExposedDropdownMenu(expanded = freqExpanded, onDismissRequest = { freqExpanded = false },
                modifier = Modifier.background(AdminSurface)) {
                FREQUENCIES.forEach { f ->
                    DropdownMenuItem(text = { Text(f.replaceFirstChar { it.uppercase() }, color = AdminCream) },
                        onClick = { freq = f; freqExpanded = false })
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (onDelete != null) {
                OutlinedButton(onClick = onDelete, modifier = Modifier.weight(1f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AdminCoral)) {
                    Text("Delete", color = AdminCoral)
                }
            } else {
                OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AdminBorder)) {
                    Text("Cancel", color = AdminCreamMuted)
                }
            }
            Button(
                onClick = {
                    val dateMs = selectedDateMs ?: return@Button
                    if (titleEn.isBlank()) return@Button
                    val at = buildScheduledAt(dateMs, selectedHour, selectedMinute)
                    onSubmit(titleEn, titleUr, at, freq != "once", freqToRule(freq))
                },
                enabled = titleEn.isNotBlank() && selectedDateMs != null,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
            ) { Text("Save", fontWeight = FontWeight.SemiBold) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DatePickerField(
    modifier: Modifier,
    label: String,
    selectedMs: Long?,
    fieldColors: TextFieldColors,
    onDateSelected: (Long) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val pickerState = rememberDatePickerState(initialSelectedDateMillis = selectedMs)

    val displayText = selectedMs?.let {
        val zdt = Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault())
        "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)}"
    } ?: "Pick date"

    OutlinedTextField(
        value = displayText, onValueChange = {}, readOnly = true, label = { Text(label) },
        modifier = modifier.clickable { showPicker = true },
        trailingIcon = { Icon(Icons.Outlined.DateRange, contentDescription = null, tint = AdminGold) },
        colors = fieldColors,
    )

    if (showPicker) {
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { onDateSelected(it) }
                    showPicker = false
                }) { Text("OK", color = AdminGold) }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Cancel", color = AdminCreamMuted) } },
            colors = DatePickerDefaults.colors(containerColor = AdminSurface),
        ) { DatePicker(state = pickerState) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerField(
    modifier: Modifier,
    label: String,
    hour: Int,
    minute: Int,
    fieldColors: TextFieldColors,
    onTimeSelected: (hour: Int, minute: Int) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val pickerState = rememberTimePickerState(initialHour = hour, initialMinute = minute, is24Hour = false)

    val h12 = if (hour % 12 == 0) 12 else hour % 12
    val period = if (hour < 12) "AM" else "PM"
    val displayText = "$h12:%02d $period".format(minute)

    OutlinedTextField(
        value = displayText, onValueChange = {}, readOnly = true, label = { Text(label) },
        modifier = modifier.clickable { showPicker = true },
        trailingIcon = { Icon(Icons.Outlined.Schedule, contentDescription = null, tint = AdminGold) },
        colors = fieldColors,
    )

    if (showPicker) {
        AlertDialog(
            onDismissRequest = { showPicker = false },
            title = { Text("Pick time", color = AdminCream) },
            text  = { TimePicker(state = pickerState) },
            confirmButton = {
                TextButton(onClick = {
                    onTimeSelected(pickerState.hour, pickerState.minute)
                    showPicker = false
                }) { Text("OK", color = AdminGold) }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }
}
