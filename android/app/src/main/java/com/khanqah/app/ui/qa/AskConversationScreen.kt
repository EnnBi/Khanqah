package com.khanqah.app.ui.qa

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu

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

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (ur) "گفتگو" else "Conversation",
                        fontFamily = if (ur) NastaleeqFontFamily else null,
                        fontSize = if (ur) 22.sp else 18.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
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
                actions = {
                    IconButton(onClick = onFollowUp) {
                        Icon(
                            Icons.AutoMirrored.Filled.Reply,
                            contentDescription = if (ur) "فالو اپ" else "Follow up",
                            tint = MaterialTheme.colorScheme.onBackground,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
            )
        },
    ) { padding ->
        if (messages.isEmpty()) {
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
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(messages) { item ->
                    Row(
                        modifier = Modifier.fillParentMaxWidth(),
                        horizontalArrangement = if (item.fromMe) Arrangement.End else Arrangement.Start,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (item.fromMe)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.surfaceVariant,
                        ) {
                            Column(
                                modifier = Modifier
                                    .widthIn(max = 280.dp)
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                if (item.text.isNotBlank()) {
                                    Text(
                                        item.text,
                                        fontFamily = NastaleeqFontFamily,
                                        fontSize = 16.sp,
                                        color = if (item.fromMe)
                                            MaterialTheme.colorScheme.onPrimaryContainer
                                        else
                                            MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                if (item.hasAudio) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(onClick = { vm.playAnswerAudio(item) }) {
                                            Icon(
                                                Icons.Filled.PlayArrow,
                                                contentDescription = null,
                                                tint = if (item.fromMe)
                                                    MaterialTheme.colorScheme.onPrimaryContainer
                                                else
                                                    MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        Text(
                                            if (ur) "آواز" else "Audio",
                                            fontFamily = if (ur) NastaleeqFontFamily else null,
                                            fontSize = if (ur) 14.sp else 12.sp,
                                            color = if (item.fromMe)
                                                MaterialTheme.colorScheme.onPrimaryContainer
                                            else
                                                MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                                // Defensive timestamp: no crash if string is short
                                val ts = try {
                                    if (item.createdAtIso.length >= 16)
                                        item.createdAtIso.take(16).replace("T", " ")
                                    else
                                        item.createdAtIso
                                } catch (_: Exception) { "" }
                                Text(
                                    ts,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
