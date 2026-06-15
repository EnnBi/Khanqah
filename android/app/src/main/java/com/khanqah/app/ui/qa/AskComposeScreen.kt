package com.khanqah.app.ui.qa

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import com.khanqah.app.qa.AudioRecorder
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import com.khanqah.app.ui.utils.LocalIsUrdu
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AskComposeScreen(
    vm: QaViewModel,
    threadId: String?,
    onSent: () -> Unit,
    onBack: () -> Unit,
) {
    SecureScreen()
    val isUrdu = LocalIsUrdu.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHost = remember { SnackbarHostState() }

    val prefs = remember { QaPrefs(context) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var question by remember { mutableStateOf("") }

    // false = text, true = audio
    var audioMode by remember { mutableStateOf(false) }

    val recorder = remember { AudioRecorder(context) }
    var isRecording by remember { mutableStateOf(false) }
    var elapsedSec by remember { mutableIntStateOf(0) }
    var recordedBytes by remember { mutableStateOf<ByteArray?>(null) }
    var recordedPath by remember { mutableStateOf<String?>(null) }

    val sendState by vm.sendState.collectAsState()

    // Prefill identity
    LaunchedEffect(Unit) {
        val (n, p, a) = prefs.load()
        name = n; phone = p; address = a
    }

    // Recording elapsed timer
    LaunchedEffect(isRecording) {
        if (isRecording) {
            elapsedSec = 0
            while (isRecording && elapsedSec < AudioRecorder.MAX_DURATION_MS / 1000) {
                delay(1000)
                elapsedSec += 1
            }
        }
    }

    // Persist recorder output to a stable cache file and capture its bytes.
    fun finishRecording() {
        val bytes = recorder.stop()
        isRecording = false
        if (bytes != null) {
            val out = File(context.cacheDir, "qa_sent_${System.currentTimeMillis()}.m4a")
            out.writeBytes(bytes)
            recordedBytes = bytes
            recordedPath = out.absolutePath
        }
    }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            recordedBytes = null
            recordedPath = null
            recorder.start { scope.launch { finishRecording() } }
            isRecording = true
        } else {
            scope.launch {
                snackbarHost.showSnackbar(
                    if (isUrdu) "مائیکروفون کی اجازت درکار ہے" else "Microphone permission required"
                )
            }
        }
    }

    // React to send result
    LaunchedEffect(sendState) {
        when (val st = sendState) {
            is SendState.Sent -> { vm.resetSend(); onSent() }
            is SendState.Error -> snackbarHost.showSnackbar(st.message)
            else -> {}
        }
    }

    val sending = sendState is SendState.Preparing || sendState is SendState.Sending
    val canSend = name.isNotBlank() && phone.isNotBlank() && address.isNotBlank() &&
        ((!audioMode && question.isNotBlank()) || (audioMode && recordedBytes != null)) &&
        !sending

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHost) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isUrdu) "نیا سوال" else "Ask a question",
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
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text(if (isUrdu) "نام" else "Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text(if (isUrdu) "فون" else "Phone") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text(if (isUrdu) "پتہ" else "Address") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )

            // Mode toggle
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = !audioMode,
                    onClick = { audioMode = false },
                    label = { Text(if (isUrdu) "متن" else "Text") },
                )
                FilterChip(
                    selected = audioMode,
                    onClick = { audioMode = true },
                    label = { Text(if (isUrdu) "آواز" else "Audio") },
                )
            }

            if (!audioMode) {
                OutlinedTextField(
                    value = question,
                    onValueChange = { question = it },
                    label = { Text(if (isUrdu) "آپ کا سوال" else "Your question") },
                    minLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val mm = elapsedSec / 60
                    val ss = elapsedSec % 60
                    Text(
                        "%d:%02d / 5:00".format(mm, ss),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    when {
                        isRecording -> {
                            Button(
                                onClick = { finishRecording() },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Filled.Stop, contentDescription = null)
                                Spacer(Modifier.size(8.dp))
                                Text(if (isUrdu) "روکیں" else "Stop")
                            }
                        }
                        recordedBytes != null -> {
                            Text(
                                if (isUrdu) "ریکارڈنگ تیار ہے" else "Recording ready",
                                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                            OutlinedButton(
                                onClick = {
                                    recordedBytes = null
                                    recordedPath = null
                                    elapsedSec = 0
                                    permLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Filled.Mic, contentDescription = null)
                                Spacer(Modifier.size(8.dp))
                                Text(if (isUrdu) "دوبارہ ریکارڈ کریں" else "Re-record")
                            }
                        }
                        else -> {
                            Button(
                                onClick = { permLauncher.launch(Manifest.permission.RECORD_AUDIO) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Filled.Mic, contentDescription = null)
                                Spacer(Modifier.size(8.dp))
                                Text(if (isUrdu) "ریکارڈ کریں" else "Record")
                            }
                        }
                    }
                }
            }

            // Privacy notice
            Text(
                if (isUrdu) "🔒 صرف حضرت پڑھ سکتے ہیں" else "🔒 Only Hazrat can read this",
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontSize = if (isUrdu) 15.sp else 12.sp,
                color = MaterialTheme.colorScheme.secondary,
            )

            // Send state progress
            if (sending) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    Spacer(Modifier.size(10.dp))
                    Text(
                        when (sendState) {
                            is SendState.Preparing -> if (isUrdu) "تیار ہو رہا ہے…" else "Preparing…"
                            else -> if (isUrdu) "بھیجا جا رہا ہے…" else "Sending…"
                        },
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
            }

            Button(
                onClick = {
                    scope.launch { prefs.save(name, phone, address) }
                    if (!audioMode) {
                        vm.sendTyped(name, phone, address, question, threadId)
                    } else {
                        val bytes = recordedBytes
                        val path = recordedPath
                        if (bytes != null && path != null) {
                            vm.sendRecorded(name, phone, address, bytes, path, threadId)
                        }
                    }
                },
                enabled = canSend,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (isUrdu) "بھیجیں" else "Send")
            }

            Spacer(Modifier.height(20.dp))
        }
    }
}
