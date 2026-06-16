package com.khanqah.app.ui.qa

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.theme.CrimsonProFontFamily
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu
import kotlinx.coroutines.delay

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
    val rows by vm.threadRows.collectAsState()

    LaunchedEffect(Unit) { vm.loadThreads() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isUrdu) "حضرت سے سوال" else "Ask Hazrat",
                            fontFamily = if (isUrdu) NastaleeqFontFamily else CrimsonProFontFamily,
                            fontSize = if (isUrdu) 24.sp else 24.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            if (isUrdu) "نجی · مکمل خفیہ" else "PRIVATE · END-TO-END ENCRYPTED",
                            fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                            fontSize = 10.sp,
                            letterSpacing = if (isUrdu) 0.sp else 1.2.sp,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
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
                ),
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (rows.isEmpty()) {
                SafetyCarousel(isUrdu = isUrdu, modifier = Modifier.fillMaxSize())
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                    verticalArrangement = Arrangement.spacedBy(11.dp),
                ) {
                    items(rows, key = { it.id }) { row ->
                        ThreadCard(
                            row = row,
                            isUrdu = isUrdu,
                            onClick = {
                                if (row.unread) vm.markThreadSeen(row.id)
                                onOpenThread(row.id)
                            },
                        )
                    }
                    item { Spacer(Modifier.height(76.dp)) } // clearance for the FAB pill
                }
            }

            AskNewButton(
                isUrdu = isUrdu,
                onClick = onAskNew,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 16.dp, vertical = 18.dp),
            )
        }
    }
}

@Composable
private fun ThreadCard(
    row: ThreadRow,
    isUrdu: Boolean,
    onClick: () -> Unit,
) {
    val answered = row.status.equals("answered", ignoreCase = true)
    val chip = if (answered) answeredChipColors() else pendingChipColors()
    val avatarChar = row.preview.trim().firstOrNull()?.toString()
        ?: if (row.isAudio) "🎙" else "؟"

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(15.dp),
            horizontalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    avatarChar,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = row.preview.ifBlank {
                        if (row.isAudio) (if (isUrdu) "آواز کا سوال" else "Voice question")
                        else (if (isUrdu) "آپ کا سوال" else "Your question")
                    },
                    fontFamily = if (row.preview.isNotBlank() || isUrdu) NastaleeqFontFamily else null,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    lineHeight = if (row.preview.isNotBlank()) 22.sp else 18.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusChip(
                        text = if (isUrdu) {
                            if (answered) "جواب آ گیا" else "زیرِ التواء"
                        } else {
                            if (answered) "Answered" else "Pending"
                        },
                        isUrdu = isUrdu,
                        bg = chip.bg,
                        fg = chip.fg,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        relativeThreadTime(row.lastMessageAt),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            }
            if (row.unread) {
                Box(
                    modifier = Modifier
                        .size(9.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.tertiary),
                )
            }
        }
    }
}

@Composable
private fun StatusChip(text: String, isUrdu: Boolean, bg: androidx.compose.ui.graphics.Color, fg: androidx.compose.ui.graphics.Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(bg)
            .padding(horizontal = 9.dp, vertical = 3.dp),
    ) {
        Text(
            text,
            fontFamily = if (isUrdu) NastaleeqFontFamily else null,
            fontSize = if (isUrdu) 12.sp else 10.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = fg,
        )
    }
}

@Composable
private fun AskNewButton(isUrdu: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.primary,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = modifier.fillMaxWidth().height(54.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.Add,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.tertiary,
            )
            Spacer(Modifier.size(9.dp))
            Text(
                if (isUrdu) "نیا سوال پوچھیں" else "Ask a new question",
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontSize = if (isUrdu) 16.sp else 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}

@Composable
private fun SafetyCarousel(isUrdu: Boolean, modifier: Modifier = Modifier) {
    val pagerState = rememberPagerState(pageCount = { SafetyMessages.size })

    // Gentle auto-advance.
    LaunchedEffect(pagerState) {
        while (true) {
            delay(4500)
            val next = (pagerState.currentPage + 1) % SafetyMessages.size
            pagerState.animateScrollToPage(next)
        }
    }

    Column(
        modifier = modifier.padding(bottom = 96.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 36.dp),
            pageSpacing = 14.dp,
        ) { page ->
            val msg = SafetyMessages[page]
            Surface(
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.surface,
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 30.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(66.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.tertiaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(msg.icon, fontSize = 30.sp)
                    }
                    Text(
                        if (isUrdu) msg.titleUr else msg.titleEn,
                        fontFamily = if (isUrdu) NastaleeqFontFamily else CrimsonProFontFamily,
                        fontSize = if (isUrdu) 22.sp else 21.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        if (isUrdu) msg.bodyUr else msg.bodyEn,
                        fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                        fontSize = if (isUrdu) 15.sp else 13.5.sp,
                        lineHeight = if (isUrdu) 28.sp else 20.sp,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            repeat(SafetyMessages.size) { i ->
                val active = i == pagerState.currentPage
                Box(
                    modifier = Modifier
                        .size(if (active) 9.dp else 7.dp)
                        .clip(CircleShape)
                        .background(
                            if (active) MaterialTheme.colorScheme.tertiary
                            else MaterialTheme.colorScheme.outline
                        ),
                )
            }
        }
    }
}
