package com.khanqah.app.ui.qa

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu

private sealed interface ConvEntry {
    data class DayHeader(val label: String) : ConvEntry
    data class Message(val item: ChatItem) : ConvEntry
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AskConversationScreen(
    vm: QaViewModel,
    threadId: String,
    onFollowUp: () -> Unit,
    onBack: () -> Unit,
) {
    SecureScreen()
    val ur = LocalIsUrdu.current
    val messages by vm.messages.collectAsState()

    LaunchedEffect(threadId) { vm.loadMessages(threadId) }

    val entries = remember(messages) { buildEntries(messages) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (ur) "حضرت" else "Hazrat",
                            fontFamily = if (ur) NastaleeqFontFamily else CrimsonProFontFamily,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            if (ur) "مکمل خفیہ" else "END-TO-END ENCRYPTED",
                            fontFamily = if (ur) NastaleeqFontFamily else null,
                            fontSize = 10.sp,
                            letterSpacing = if (ur) 0.sp else 1.2.sp,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onBackground,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            FollowUpBar(isUrdu = ur, onClick = onFollowUp)
        },
    ) { padding ->
        if (entries.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (ur) "ابھی تک کوئی پیغام نہیں۔" else "No messages yet.",
                    fontFamily = if (ur) NastaleeqFontFamily else null,
                    fontSize = if (ur) 18.sp else 14.sp,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(entries) { entry ->
                    when (entry) {
                        is ConvEntry.DayHeader -> DaySeparator(entry.label)
                        is ConvEntry.Message -> MessageBubble(entry.item, ur, vm)
                    }
                }
            }
        }
    }
}

@Composable
private fun DaySeparator(label: String) {
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                .padding(horizontal = 12.dp, vertical = 3.dp),
        ) {
            Text(
                label,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.secondary,
            )
        }
    }
}

@Composable
private fun MessageBubble(item: ChatItem, ur: Boolean, vm: QaViewModel) {
    val mine = item.fromMe
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 18.dp, topEnd = 18.dp,
                bottomEnd = if (mine) 5.dp else 18.dp,
                bottomStart = if (mine) 18.dp else 5.dp,
            ),
            color = if (mine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
            border = if (mine) null
            else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        ) {
            val onBubble = if (mine) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
            Column(
                modifier = Modifier
                    .widthIn(max = 270.dp)
                    .padding(horizontal = 14.dp, vertical = 11.dp),
            ) {
                if (!mine) {
                    Text(
                        if (ur) "حضرت" else "Hazrat",
                        fontFamily = if (ur) NastaleeqFontFamily else null,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.tertiary,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
                if (item.replyToId != null) {
                    ReplyQuote(item = item, ur = ur, onBubble = onBubble)
                    Spacer(Modifier.height(7.dp))
                }
                if (item.text.isNotBlank()) {
                    Text(
                        item.text,
                        fontFamily = NastaleeqFontFamily,
                        fontSize = 16.sp,
                        lineHeight = 28.sp,
                        color = onBubble,
                    )
                }
                if (item.hasAudio) {
                    if (item.text.isNotBlank()) Spacer(Modifier.height(8.dp))
                    AudioRow(item = item, onBubble = onBubble, vm = vm)
                }
                Spacer(Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        shortTime(item.createdAtIso),
                        fontSize = 10.sp,
                        color = onBubble.copy(alpha = 0.65f),
                    )
                    if (mine) {
                        Spacer(Modifier.width(4.dp))
                        Text("✓✓", fontSize = 10.sp, color = onBubble.copy(alpha = 0.65f))
                    }
                }
            }
        }
    }
}

@Composable
private fun ReplyQuote(item: ChatItem, ur: Boolean, onBubble: Color) {
    val accent = MaterialTheme.colorScheme.tertiary
    val label = when {
        item.replyToText != null -> item.replyToText
        item.replyToIsAudio -> if (ur) "🎙 آواز کا سوال" else "🎙 Voice question"
        else -> if (ur) "آپ کا سوال" else "Your question"
    }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(onBubble.copy(alpha = 0.08f))
            .height(IntrinsicSize.Min),
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .fillMaxHeight()
                .background(accent),
        )
        Column(modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp)) {
            Text(
                if (ur) "آپ کے سوال کے جواب میں" else "Replying to your question",
                fontFamily = if (ur) NastaleeqFontFamily else null,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                color = accent,
            )
            Text(
                label,
                fontFamily = NastaleeqFontFamily,
                fontSize = 13.sp,
                lineHeight = 20.sp,
                color = onBubble.copy(alpha = 0.8f),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun AudioRow(item: ChatItem, onBubble: Color, vm: QaViewModel) {
    val playback by vm.audioPlayer.playback.collectAsState()
    val active = playback.key == item.id
    val playing = active && playback.isPlaying
    val durationMs = if (active && playback.durationMs > 0) playback.durationMs else 0
    val positionMs = if (active) playback.positionMs else 0
    val fraction = if (durationMs > 0) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.widthIn(min = 200.dp),
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.tertiary)
                .clickable { vm.onPlayPause(item) },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                contentDescription = if (playing) "Pause" else "Play",
                tint = MaterialTheme.colorScheme.onTertiary,
                modifier = Modifier.size(22.dp),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Slider(
                value = fraction,
                onValueChange = { f -> if (active && durationMs > 0) vm.seek((f * durationMs).toInt()) },
                enabled = active,
                colors = SliderDefaults.colors(
                    thumbColor = MaterialTheme.colorScheme.tertiary,
                    activeTrackColor = MaterialTheme.colorScheme.tertiary,
                    inactiveTrackColor = onBubble.copy(alpha = 0.25f),
                    disabledThumbColor = onBubble.copy(alpha = 0.55f),
                    disabledActiveTrackColor = MaterialTheme.colorScheme.tertiary,
                    disabledInactiveTrackColor = onBubble.copy(alpha = 0.25f),
                ),
                modifier = Modifier.fillMaxWidth().height(20.dp),
            )
            Text(
                formatClock(if (active && positionMs > 0) positionMs else durationMs),
                fontSize = 10.sp,
                color = onBubble.copy(alpha = 0.65f),
            )
        }
    }
}

private fun formatClock(ms: Int): String {
    if (ms <= 0) return "0:00"
    val totalSec = ms / 1000
    return "%d:%02d".format(totalSec / 60, totalSec % 60)
}

@Composable
private fun FollowUpBar(isUrdu: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(22.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(22.dp))
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Text(
                if (isUrdu) "مزید سوال ریکارڈ کریں…" else "Record a follow-up…",
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontSize = if (isUrdu) 14.sp else 13.sp,
                color = MaterialTheme.colorScheme.secondary,
            )
        }
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary)
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Filled.Mic,
                contentDescription = if (isUrdu) "نیا سوال" else "New question",
                tint = MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

private fun buildEntries(messages: List<ChatItem>): List<ConvEntry> {
    val out = ArrayList<ConvEntry>(messages.size + 2)
    var lastDay: String? = null
    for (m in messages) {
        val day = dayLabelOf(m.createdAtIso)
        if (day != null && day != lastDay) {
            out.add(ConvEntry.DayHeader(day))
            lastDay = day
        }
        out.add(ConvEntry.Message(m))
    }
    return out
}

private fun dayLabelOf(iso: String): String? = try {
    val date = java.time.Instant.parse(iso).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
    val today = java.time.LocalDate.now()
    when (date) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        else -> date.format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy"))
    }
} catch (_: Exception) {
    null
}

private fun shortTime(iso: String): String = try {
    java.time.Instant.parse(iso)
        .atZone(java.time.ZoneId.systemDefault())
        .format(java.time.format.DateTimeFormatter.ofPattern("h:mm a"))
} catch (_: Exception) {
    if (iso.length >= 16) iso.substring(11, 16) else iso
}
