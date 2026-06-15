package com.khanqah.app.ui.qa

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
fun AskThreadListScreen(
    vm: QaViewModel,
    onAskNew: () -> Unit,
    onOpenThread: (String) -> Unit,
    onBack: () -> Unit,
) {
    SecureScreen()
    val isUrdu = LocalIsUrdu.current
    val threads by vm.threads.collectAsState()

    LaunchedEffect(Unit) { vm.loadThreads() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isUrdu) "حضرت سے سوال" else "Ask Hazrat",
                        fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                        fontSize = if (isUrdu) 22.sp else 18.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                navigationIcon = {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        modifier = Modifier
                            .padding(start = 12.dp)
                            .clickable(onClick = onBack),
                        tint = MaterialTheme.colorScheme.onBackground,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAskNew,
                containerColor = MaterialTheme.colorScheme.tertiary,
                contentColor = MaterialTheme.colorScheme.onTertiary,
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = {
                    Text(
                        if (isUrdu) "نیا سوال" else "Ask a new question",
                        fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                        fontSize = if (isUrdu) 16.sp else 14.sp,
                    )
                },
            )
        },
    ) { padding ->
        if (threads.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (isUrdu) "ابھی تک کوئی سوال نہیں۔ نیچے سے نیا سوال پوچھیں۔"
                    else "No questions yet. Ask a new one below.",
                    fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                    fontSize = if (isUrdu) 18.sp else 14.sp,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                items(threads) { thread ->
                    val answered = thread.status.equals("answered", ignoreCase = true)
                    ListItem(
                        modifier = Modifier.clickable { onOpenThread(thread.id) },
                        colors = ListItemDefaults.colors(
                            containerColor = MaterialTheme.colorScheme.background,
                        ),
                        headlineContent = {
                            Text(
                                if (isUrdu) {
                                    if (answered) "جواب دیا گیا" else "زیرِ التواء"
                                } else {
                                    if (answered) "Answered" else "Pending"
                                },
                                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = if (isUrdu) 18.sp else 15.sp,
                                color = if (answered) MaterialTheme.colorScheme.tertiary
                                else MaterialTheme.colorScheme.secondary,
                            )
                        },
                        supportingContent = {
                            Text(
                                formatThreadTime(thread.lastMessageAt),
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        },
                    )
                }
            }
        }
    }
}

private fun formatThreadTime(iso: String): String = try {
    val instant = java.time.Instant.parse(iso)
    val zdt = instant.atZone(java.time.ZoneId.systemDefault())
    val fmt = java.time.format.DateTimeFormatter.ofPattern("d MMM, HH:mm")
    zdt.format(fmt)
} catch (_: Exception) {
    iso
}
