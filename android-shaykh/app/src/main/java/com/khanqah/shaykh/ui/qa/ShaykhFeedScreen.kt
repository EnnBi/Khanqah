package com.khanqah.shaykh.ui.qa

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.shaykh.data.repository.IncomingQuestion
import com.khanqah.shaykh.qa.AudioRecorder
import com.khanqah.shaykh.ui.util.toUrduDigits
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShaykhFeedScreen(vm: ShaykhQueueViewModel, onLogout: () -> Unit) {
    SecureScreen()
    val questions by vm.questions.collectAsState()
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) { vm.load() }

    when (state) {
        is QueueState.Loading -> CenterText("لوڈ ہو رہا ہے…")
        is QueueState.Error -> CenterText("خرابی — دوبارہ کوشش کریں", onTap = { vm.load() })
        is QueueState.Ready -> {
            if (questions.isEmpty()) { CenterText("کوئی نیا سوال نہیں"); return }
            val pager = rememberPagerState(pageCount = { questions.size })
            LaunchedEffect(pager.currentPage, questions.size) {
                questions.getOrNull(pager.currentPage)?.let { vm.play(it) }
            }
            var sheetFor by remember { mutableStateOf<IncomingQuestion?>(null) }
            VerticalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
                questions.getOrNull(page)?.let { q ->
                    QuestionCard(q = q, index = page, total = questions.size,
                        vm = vm, onAnswer = { sheetFor = q })
                }
            }
            sheetFor?.let { q -> AnswerSheet(vm = vm, question = q, onClose = { sheetFor = null }) }
        }
    }
}

@Composable
private fun CenterText(text: String, onTap: (() -> Unit)? = null) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        if (onTap != null) TextButton(onClick = onTap) { Text(text, style = MaterialTheme.typography.titleLarge) }
        else Text(text, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun QuestionCard(q: IncomingQuestion, index: Int, total: Int, vm: ShaykhQueueViewModel, onAnswer: () -> Unit) {
    val gold = MaterialTheme.colorScheme.tertiary
    val playback by vm.audioPlayer.playback.collectAsState()
    val active = playback.key == q.messageId
    val playing = active && playback.isPlaying
    val durationMs = if (active && playback.durationMs > 0) playback.durationMs else 0
    val positionMs = if (active) playback.positionMs else 0
    val fraction = if (durationMs > 0) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f

    Box(Modifier.fillMaxSize().padding(22.dp)) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${(index + 1).toUrduDigits()} / ${total.toUrduDigits()}", color = gold, style = MaterialTheme.typography.titleMedium)
                Column(horizontalAlignment = Alignment.End) {
                    Text(q.name, style = MaterialTheme.typography.titleLarge)
                    if (q.address.isNotBlank()) Text(q.address, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
                    if (q.phone.isNotBlank()) Text(q.phone, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                }
            }
            Spacer(Modifier.height(28.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Surface(onClick = { vm.onPlayPause(q) }, shape = CircleShape, color = gold, modifier = Modifier.size(96.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(if (playing) "❚❚" else "▶", fontSize = 36.sp, color = MaterialTheme.colorScheme.onTertiary)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Slider(
                    value = fraction,
                    onValueChange = { f -> if (active && durationMs > 0) vm.seek((f * durationMs).toInt()) },
                    enabled = active,
                    colors = SliderDefaults.colors(activeTrackColor = gold, thumbColor = gold),
                    modifier = Modifier.fillMaxWidth(0.8f),
                )
                val secs = (if (active && positionMs > 0) positionMs else durationMs) / 1000
                Text(
                    "${(secs / 60).toUrduDigits()}:${(secs % 60).toUrduDigits().padStart(2, '۰')}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
                Spacer(Modifier.height(18.dp))
                if (q.text.isNotBlank())
                    Text(q.text, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center,
                        modifier = Modifier.heightIn(max = 200.dp).verticalScroll(rememberScrollState()))
            }
            Button(onClick = onAnswer, modifier = Modifier.fillMaxWidth().height(60.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = gold, contentColor = MaterialTheme.colorScheme.onTertiary)) {
                Text("جواب دیں 🎙", style = MaterialTheme.typography.titleLarge)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AnswerSheet(vm: ShaykhQueueViewModel, question: IncomingQuestion, onClose: () -> Unit) {
    val context = LocalContext.current
    val recorder = remember { AudioRecorder(context) }
    var recording by remember { mutableStateOf(false) }
    var elapsed by remember { mutableStateOf(0) }
    var recordedBytes by remember { mutableStateOf<ByteArray?>(null) }
    val answerState by vm.answerState.collectAsState()

    fun beginRecording() {
        runCatching {
            recorder.start(onMaxReached = { recordedBytes = recorder.stop(); recording = false })
            recording = true
        }
    }
    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) beginRecording()
    }

    LaunchedEffect(recording) {
        if (recording) { elapsed = 0; while (recording && elapsed < AudioRecorder.MAX_DURATION_MS / 1000) { delay(1000); elapsed++ } }
    }
    LaunchedEffect(answerState) { if (answerState is AnswerState.Sent) { vm.resetAnswer(); onClose() } }

    ModalBottomSheet(onDismissRequest = { if (recording) recorder.cancel(); onClose() }) {
        Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(if (recordedBytes == null) "جواب ریکارڈ کریں" else "جواب تیار ہے", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(20.dp))
            val mm = elapsed / 60; val ss = elapsed % 60
            Text("${mm.toUrduDigits()}:${ss.toUrduDigits().padStart(2, '۰')}", style = MaterialTheme.typography.displaySmall)
            Spacer(Modifier.height(20.dp))
            Surface(
                onClick = {
                    if (!recording && recordedBytes == null) {
                        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
                            beginRecording()
                        else
                            micPermission.launch(Manifest.permission.RECORD_AUDIO)
                    } else if (recording) {
                        recordedBytes = recorder.stop(); recording = false
                    }
                },
                shape = CircleShape,
                color = if (recording) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.size(110.dp),
            ) { Box(contentAlignment = Alignment.Center) { Text(if (recording) "■" else "🎙", fontSize = 44.sp) } }
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { recordedBytes = null; elapsed = 0 }, modifier = Modifier.weight(1f), enabled = recordedBytes != null) { Text("دوبارہ") }
                Button(onClick = { vm.sendAnswer(question, recordedBytes, "") }, modifier = Modifier.weight(1f),
                    enabled = recordedBytes != null && answerState !is AnswerState.Sending) {
                    Text(if (answerState is AnswerState.Sending) "بھیجا جا رہا ہے…" else "بھیجیں ✓")
                }
            }
            (answerState as? AnswerState.Error)?.let { Spacer(Modifier.height(10.dp)); Text(it.msg, color = MaterialTheme.colorScheme.error) }
            Spacer(Modifier.height(12.dp))
        }
    }
}
