package com.khanqah.shaykh.ui.qa

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.shaykh.data.repository.IncomingQuestion
import com.khanqah.shaykh.qa.AudioRecorder
import com.khanqah.shaykh.ui.theme.LocalShaykhColors
import com.khanqah.shaykh.ui.theme.NastaleeqFontFamily
import com.khanqah.shaykh.ui.util.toUrduDigits
import kotlinx.coroutines.delay
import kotlin.math.abs

private fun clock(totalSec: Int) = "%d:%02d".format(totalSec / 60, totalSec % 60)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShaykhFeedScreen(vm: ShaykhQueueViewModel, onLogout: () -> Unit) {
    SecureScreen()
    val c = LocalShaykhColors.current
    val questions by vm.questions.collectAsState()
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) { vm.load() }

    // Paint the emerald/parchment background — Compose screens don't inherit the window bg.
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(c.bg1, c.bg2)))) {
        when (state) {
            is QueueState.Loading -> LoadingSkeleton()
            is QueueState.Error -> ErrorState(onRetry = { vm.load() })
            is QueueState.Ready -> {
                if (questions.isEmpty()) { EmptyState() } else {
                    val pager = rememberPagerState(pageCount = { questions.size })
                    // Stop the current clip the moment the user starts swiping away.
                    LaunchedEffect(pager.isScrollInProgress) {
                        if (pager.isScrollInProgress) vm.stopAudio()
                    }
                    LaunchedEffect(pager.currentPage, questions.size) {
                        questions.getOrNull(pager.currentPage)?.let { vm.play(it) }
                    }
                    var sheetFor by remember { mutableStateOf<IncomingQuestion?>(null) }
                    VerticalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
                        questions.getOrNull(page)?.let { q ->
                            QuestionCard(
                                q = q, index = page, total = questions.size, vm = vm,
                                onAnswer = { sheetFor = q },
                                onDismiss = { vm.dismiss(q) },
                            )
                        }
                    }
                    sheetFor?.let { q -> AnswerSheet(vm = vm, question = q, onClose = { sheetFor = null }) }
                }
            }
        }

        // Log out — always reachable, top corner.
        var showLogout by remember { mutableStateOf(false) }
        IconButton(onClick = { showLogout = true }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(6.dp)) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Log out", tint = c.muted)
        }
        if (showLogout) {
            AlertDialog(
                onDismissRequest = { showLogout = false },
                containerColor = c.card,
                title = { Text("لاگ آؤٹ؟", fontFamily = NastaleeqFontFamily, fontWeight = FontWeight.Bold, color = c.text) },
                text = { Text("دوبارہ سائن ان کرنا ہوگا", fontFamily = NastaleeqFontFamily, color = c.muted) },
                confirmButton = {
                    TextButton(onClick = { showLogout = false; onLogout() }) {
                        Text("لاگ آؤٹ", fontFamily = NastaleeqFontFamily, fontWeight = FontWeight.Bold, color = c.coral)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogout = false }) {
                        Text("منسوخ", fontFamily = NastaleeqFontFamily, color = c.muted)
                    }
                },
            )
        }
    }
}

/* ─────────────────────────── Question card ─────────────────────────── */

@Composable
private fun QuestionCard(
    q: IncomingQuestion, index: Int, total: Int,
    vm: ShaykhQueueViewModel, onAnswer: () -> Unit, onDismiss: () -> Unit,
) {
    val c = LocalShaykhColors.current
    val playback by vm.audioPlayer.playback.collectAsState()
    val loadingKey by vm.loadingKey.collectAsState()
    val active = playback.key == q.messageId
    val playing = active && playback.isPlaying
    val loading = loadingKey == q.messageId && !playing
    val durationMs = if (active && playback.durationMs > 0) playback.durationMs else 0
    val positionMs = if (active) playback.positionMs else 0
    val fraction = if (durationMs > 0) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f
    val totalSec = if (durationMs > 0) durationMs / 1000 else q.audioRef?.let { 0 } ?: 0

    Column(
        Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(8.dp))
        // header — a prominent "Question N of total" pill
        Box(
            Modifier.clip(RoundedCornerShape(24.dp)).background(c.card2)
                .border(1.dp, c.border, RoundedCornerShape(24.dp))
                .padding(horizontal = 22.dp, vertical = 10.dp),
        ) {
            Text("سوال ${(index + 1).toUrduDigits()} / ${total.toUrduDigits()}",
                fontFamily = NastaleeqFontFamily, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = c.gold)
        }
        Spacer(Modifier.height(34.dp))
        // identity
        Text(q.name, fontFamily = NastaleeqFontFamily, fontSize = 35.sp, fontWeight = FontWeight.Bold,
            color = c.text, textAlign = TextAlign.Center, lineHeight = 50.sp)
        val sub = listOfNotNull(q.address.takeIf { it.isNotBlank() }).joinToString(" · ")
        if (sub.isNotBlank()) Text(sub, fontFamily = NastaleeqFontFamily, fontSize = 19.sp,
            fontWeight = FontWeight.Bold, color = c.muted, textAlign = TextAlign.Center)

        // stage
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            PlayRing(fraction = fraction, playing = playing, loading = loading, c = c, onClick = { vm.onPlayPause(q) })
            Spacer(Modifier.height(26.dp))
            // Audio progress reads left-to-right even though the app is RTL.
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Waveform(seed = q.messageId.hashCode(), fraction = if (active) fraction else 0f, c = c,
                        modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(.86f), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(clock(positionMs / 1000), fontFamily = FontFamily.SansSerif, fontSize = 15.sp,
                            fontWeight = FontWeight.Bold, color = if (playing) c.gold else c.muted)
                        Text(clock(totalSec), fontFamily = FontFamily.SansSerif, fontSize = 15.sp,
                            fontWeight = FontWeight.Bold, color = c.muted)
                    }
                }
            }
            if (q.text.isNotBlank()) {
                Spacer(Modifier.height(20.dp))
                Text(q.text, fontFamily = NastaleeqFontFamily, fontSize = 24.sp, lineHeight = 46.sp,
                    color = c.text.copy(alpha = .92f), textAlign = TextAlign.Center,
                    modifier = Modifier.heightIn(max = 150.dp).verticalScroll(rememberScrollState()))
            }
        }

        // footer: leave + answer
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            GhostButton("چھوڑ دیں", c, Modifier.weight(1f), onClick = onDismiss)
            GoldButton("جواب دیں", c, Modifier.weight(1.3f), trailing = Icons.Filled.Mic, onClick = onAnswer)
        }
    }
}

@Composable
private fun PlayRing(fraction: Float, playing: Boolean, loading: Boolean, c: com.khanqah.shaykh.ui.theme.ShaykhColors, onClick: () -> Unit) {
    Box(contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(124.dp)) {
            val stroke = 5.dp.toPx()
            val inset = stroke / 2
            val arcSize = Size(size.width - stroke, size.height - stroke)
            drawArc(color = c.ringTrack, startAngle = 0f, sweepAngle = 360f, useCenter = false,
                topLeft = Offset(inset, inset), size = arcSize, style = Stroke(stroke))
            if (fraction > 0f) drawArc(color = c.gold, startAngle = -90f, sweepAngle = 360f * fraction,
                useCenter = false, topLeft = Offset(inset, inset), size = arcSize,
                style = Stroke(stroke, cap = StrokeCap.Round))
        }
        Box(
            Modifier.size(88.dp).clip(CircleShape)
                .background(Brush.linearGradient(listOf(c.goldBright, c.goldDeep)))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            if (loading) {
                CircularProgressIndicator(color = c.onGold, strokeWidth = 3.dp, modifier = Modifier.size(34.dp))
            } else {
                Icon(if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = if (playing) "Pause" else "Play",
                    tint = c.onGold, modifier = Modifier.size(40.dp))
            }
        }
    }
}

@Composable
private fun Waveform(seed: Int, fraction: Float, c: com.khanqah.shaykh.ui.theme.ShaykhColors, modifier: Modifier = Modifier) {
    val heights = remember(seed) {
        val r = java.util.Random(seed.toLong())
        List(30) { 8 + abs(r.nextInt() % 44) }
    }
    Row(modifier.height(56.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        heights.forEachIndexed { i, h ->
            val played = i.toFloat() / heights.size <= fraction
            Box(Modifier.weight(1f).height(h.dp).clip(RoundedCornerShape(3.dp))
                .background(if (played) c.goldBright else c.waveOff))
        }
    }
}

/* ─────────────────────────── Answer sheet ─────────────────────────── */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AnswerSheet(vm: ShaykhQueueViewModel, question: IncomingQuestion, onClose: () -> Unit) {
    val c = LocalShaykhColors.current
    val context = LocalContext.current
    val recorder = remember { AudioRecorder(context) }
    var recording by remember { mutableStateOf(false) }
    var elapsed by remember { mutableIntStateOf(0) }
    var recordedBytes by remember { mutableStateOf<ByteArray?>(null) }
    val amps = remember { mutableStateListOf<Int>() }
    val answerState by vm.answerState.collectAsState()
    val sending = answerState is AnswerState.Sending

    fun begin() {
        amps.clear(); elapsed = 0; recordedBytes = null
        runCatching { recorder.start(onMaxReached = { recordedBytes = recorder.stop(); recording = false }) }
        recording = true
    }
    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) begin() }

    LaunchedEffect(recording) {
        if (recording) {
            var t = 0
            while (recording && t < AudioRecorder.MAX_DURATION_MS) {
                amps.add(recorder.amplitude()); if (amps.size > 36) amps.removeAt(0)
                delay(120); t += 120; elapsed = t / 1000
            }
        }
    }
    LaunchedEffect(answerState) { if (answerState is AnswerState.Sent) { vm.resetAnswer(); onClose() } }

    ModalBottomSheet(
        onDismissRequest = { if (recording) recorder.cancel(); onClose() },
        containerColor = c.card,
        dragHandle = { Box(Modifier.padding(top = 12.dp).size(width = 38.dp, height = 4.dp).clip(RoundedCornerShape(3.dp)).background(c.border)) },
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {

            val ready = recordedBytes != null
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(if (!ready) "جواب ریکارڈ ہو رہا ہے" else "جواب تیار ہے",
                    fontFamily = NastaleeqFontFamily, fontSize = 27.sp, fontWeight = FontWeight.Bold, color = c.text)
                if (recording) { Spacer(Modifier.width(8.dp)); Box(Modifier.size(9.dp).clip(CircleShape).background(c.coral)) }
            }

            if (!ready) {
                Text(clock(elapsed), fontFamily = FontFamily.SansSerif, fontSize = 54.sp, fontWeight = FontWeight.Bold, color = c.text)
                LiveWave(amps = amps, color = c.gold, modifier = Modifier.fillMaxWidth())
            } else {
                Waveform(seed = question.messageId.hashCode() + 7, fraction = 0f, c = c, modifier = Modifier.fillMaxWidth())
                Text("${clock(elapsed)} · سننے کے لیے دبائیں", fontFamily = NastaleeqFontFamily, fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold, color = c.muted)
            }

            Spacer(Modifier.height(4.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                if (!ready) {
                    RoundCtrl(Icons.Filled.Close, "منسوخ", c, big = false) { if (recording) recorder.cancel(); onClose() }
                    RoundCtrl(if (recording) Icons.Filled.Stop else Icons.Filled.Mic, if (recording) "روکیں" else "ریکارڈ", c, big = true, danger = recording) {
                        if (recording) { recordedBytes = recorder.stop(); recording = false }
                        else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) begin()
                        else micPermission.launch(Manifest.permission.RECORD_AUDIO)
                    }
                    Spacer(Modifier.size(56.dp))
                } else {
                    RoundCtrl(Icons.Filled.Refresh, "دوبارہ", c, big = false, enabled = !sending) { recordedBytes = null; amps.clear(); elapsed = 0 }
                    RoundCtrl(Icons.AutoMirrored.Filled.Send, if (sending) "…" else "بھیجیں", c, big = true, gold = true, enabled = !sending) {
                        recordedBytes?.let { vm.sendAnswer(question, it, "", elapsed) }
                    }
                    RoundCtrl(Icons.Filled.PlayArrow, "سنیں", c, big = false, enabled = !sending) {
                        recordedBytes?.let { vm.audioPlayer.start("answer_preview", it) }
                    }
                }
            }
            (answerState as? AnswerState.Error)?.let { Text(it.msg, color = c.coral, fontFamily = NastaleeqFontFamily, fontSize = 14.sp) }
        }
    }
}

@Composable
private fun LiveWave(amps: List<Int>, color: Color, modifier: Modifier = Modifier) {
    Row(modifier.height(48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        val shown = amps.takeLast(36)
        if (shown.isEmpty()) {
            repeat(36) { Box(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(3.dp)).background(color.copy(alpha = .3f))) }
        } else shown.forEach { a ->
            val f = (a / 32767f).coerceIn(.05f, 1f)
            Box(Modifier.weight(1f).height((6 + f * 40).dp).clip(RoundedCornerShape(3.dp)).background(color))
        }
    }
}

@Composable
private fun RoundCtrl(icon: ImageVector, label: String, c: com.khanqah.shaykh.ui.theme.ShaykhColors,
                      big: Boolean, gold: Boolean = false, danger: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        val size = if (big) 74.dp else 56.dp
        val bg: Modifier = when {
            danger -> Modifier.background(c.coral)
            gold -> Modifier.background(Brush.linearGradient(listOf(c.goldBright, c.gold)))
            else -> Modifier.background(c.card2)
        }
        Box(
            Modifier.size(size).clip(CircleShape).then(bg).clickable(enabled = enabled, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = label, modifier = Modifier.size(if (big) 30.dp else 24.dp),
                tint = if (danger) Color.White else if (gold) c.onGold else c.text)
        }
        Text(label, fontFamily = NastaleeqFontFamily, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = c.muted)
    }
}

/* ─────────────────────────── States ─────────────────────────── */

@Composable
private fun GoldButton(textUrdu: String, c: com.khanqah.shaykh.ui.theme.ShaykhColors, modifier: Modifier = Modifier, trailing: ImageVector? = null, onClick: () -> Unit) {
    Box(modifier.height(64.dp).clip(RoundedCornerShape(18.dp))
        .background(Brush.linearGradient(listOf(c.goldBright, c.gold))).clickable(onClick = onClick),
        contentAlignment = Alignment.Center) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(textUrdu, fontFamily = NastaleeqFontFamily, fontSize = 25.sp, fontWeight = FontWeight.Bold, color = c.onGold)
            if (trailing != null) Icon(trailing, contentDescription = null, tint = c.onGold, modifier = Modifier.size(22.dp))
        }
    }
}

@Composable
private fun GhostButton(textUrdu: String, c: com.khanqah.shaykh.ui.theme.ShaykhColors, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(modifier.height(62.dp).clip(RoundedCornerShape(18.dp))
        .border(1.5.dp, c.border, RoundedCornerShape(18.dp)).clickable(onClick = onClick),
        contentAlignment = Alignment.Center) {
        Text(textUrdu, fontFamily = NastaleeqFontFamily, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = c.muted)
    }
}

@Composable
private fun EmptyState() {
    val c = LocalShaykhColors.current
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(40.dp)) {
            Box(Modifier.size(100.dp).clip(CircleShape).background(c.card2).border(1.5.dp, c.border, CircleShape), contentAlignment = Alignment.Center) {
                Text("۰", fontFamily = NastaleeqFontFamily, fontSize = 42.sp, color = c.gold)
            }
            Text("اس وقت کوئی نیا سوال نہیں", fontFamily = NastaleeqFontFamily, fontSize = 30.sp, fontWeight = FontWeight.Bold, color = c.text, textAlign = TextAlign.Center, lineHeight = 56.sp)
            Text("جب کوئی سوال آئے گا وہ یہاں ظاہر ہوگا", fontFamily = NastaleeqFontFamily, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = c.muted, textAlign = TextAlign.Center, lineHeight = 40.sp)
        }
    }
}

@Composable
private fun ErrorState(onRetry: () -> Unit) {
    val c = LocalShaykhColors.current
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(40.dp)) {
            Box(Modifier.size(100.dp).clip(CircleShape).background(c.card2).border(1.5.dp, c.coral, CircleShape), contentAlignment = Alignment.Center) {
                Text("⟳", fontSize = 42.sp, color = c.coral)
            }
            Text("سوالات لوڈ نہیں ہو سکے", fontFamily = NastaleeqFontFamily, fontSize = 30.sp, fontWeight = FontWeight.Bold, color = c.text, textAlign = TextAlign.Center, lineHeight = 56.sp)
            Text("انٹرنیٹ کنکشن چیک کریں", fontFamily = NastaleeqFontFamily, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = c.muted, textAlign = TextAlign.Center)
            Spacer(Modifier.height(2.dp))
            Box(Modifier.height(56.dp).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(c.goldBright, c.gold))).clickable(onClick = onRetry).padding(horizontal = 32.dp), contentAlignment = Alignment.Center) {
                Text("دوبارہ کوشش کریں", fontFamily = NastaleeqFontFamily, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = c.onGold)
            }
        }
    }
}

@Composable
private fun LoadingSkeleton() {
    val c = LocalShaykhColors.current
    @Composable fun sk(mod: Modifier) = Box(mod.clip(RoundedCornerShape(8.dp)).background(c.card2))
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 24.dp, vertical = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(8.dp))
        sk(Modifier.size(width = 110.dp, height = 40.dp).clip(RoundedCornerShape(24.dp)))
        Spacer(Modifier.height(18.dp))
        sk(Modifier.size(width = 150.dp, height = 26.dp)); Spacer(Modifier.height(10.dp)); sk(Modifier.size(width = 90.dp, height = 14.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            sk(Modifier.size(124.dp).clip(CircleShape))
            Spacer(Modifier.height(26.dp))
            sk(Modifier.fillMaxWidth().height(48.dp))
            Spacer(Modifier.height(20.dp))
            sk(Modifier.fillMaxWidth(.72f).height(16.dp)); Spacer(Modifier.height(10.dp)); sk(Modifier.fillMaxWidth(.54f).height(16.dp))
        }
        Text("سوالات لوڈ ہو رہے ہیں…", fontFamily = NastaleeqFontFamily, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = c.muted)
        Spacer(Modifier.height(12.dp))
        sk(Modifier.fillMaxWidth().height(62.dp).clip(RoundedCornerShape(18.dp)))
    }
}
