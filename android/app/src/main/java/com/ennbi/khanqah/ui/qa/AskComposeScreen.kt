package com.khanqah.app.ui.qa

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import com.khanqah.app.qa.AudioRecorder
import com.khanqah.app.ui.theme.CrimsonProFontFamily
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

    val recorder = remember { AudioRecorder(context) }
    var isRecording by remember { mutableStateOf(false) }
    var elapsedSec by remember { mutableIntStateOf(0) }
    var recordedBytes by remember { mutableStateOf<ByteArray?>(null) }
    var recordedPath by remember { mutableStateOf<String?>(null) }

    val sendState by vm.sendState.collectAsState()

    LaunchedEffect(Unit) {
        val (n, p, a) = prefs.load()
        name = n; phone = p; address = a
    }

    LaunchedEffect(isRecording) {
        if (isRecording) {
            elapsedSec = 0
            while (isRecording && elapsedSec < AudioRecorder.MAX_DURATION_MS / 1000) {
                delay(1000)
                elapsedSec += 1
            }
        }
    }

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

    LaunchedEffect(sendState) {
        when (val st = sendState) {
            is SendState.Sent -> { vm.resetSend(); onSent() }
            is SendState.Error -> snackbarHost.showSnackbar(st.message)
            else -> {}
        }
    }

    val sending = sendState is SendState.Preparing || sendState is SendState.Sending
    val canSend = name.isNotBlank() && phone.isNotBlank() && address.isNotBlank() &&
        recordedBytes != null && !sending

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHost) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isUrdu) "نیا سوال" else "New Question",
                            fontFamily = if (isUrdu) NastaleeqFontFamily else CrimsonProFontFamily,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            if (isUrdu) "صرف حضرت پڑھ سکتے ہیں" else "ONLY HAZRAT CAN READ THIS",
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 18.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Spacer(Modifier.height(4.dp))

            LabeledField(
                label = if (isUrdu) "آپ کا نام" else "Your name",
                value = name, onValueChange = { name = it },
                isUrdu = isUrdu,
            )
            LabeledField(
                label = if (isUrdu) "فون" else "Phone",
                value = phone, onValueChange = { phone = it },
                isUrdu = isUrdu,
                keyboardType = KeyboardType.Phone,
            )
            LabeledField(
                label = if (isUrdu) "پتہ" else "Address",
                value = address, onValueChange = { address = it },
                isUrdu = isUrdu,
                minLines = 2,
            )

            Spacer(Modifier.height(2.dp))
            Text(
                if (isUrdu) "اپنا سوال ریکارڈ کریں" else "Record your question",
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontSize = if (isUrdu) 13.sp else 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = if (isUrdu) 0.sp else 0.8.sp,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            RecorderCard(
                isUrdu = isUrdu,
                isRecording = isRecording,
                hasRecording = recordedBytes != null,
                elapsedSec = elapsedSec,
                onStart = { permLauncher.launch(Manifest.permission.RECORD_AUDIO) },
                onStop = { finishRecording() },
                onRerecord = {
                    recordedBytes = null
                    recordedPath = null
                    elapsedSec = 0
                    permLauncher.launch(Manifest.permission.RECORD_AUDIO)
                },
            )

            Spacer(Modifier.height(14.dp))
            PrivacyBanner(
                text = if (isUrdu) "🔒 آپ کی ریکارڈنگ بھیجنے سے پہلے آپ کے فون پر خفیہ کر دی جاتی ہے۔"
                else "🔒 Your recording is encrypted on your device before sending.",
                isUrdu = isUrdu,
            )

            if (sending) {
                Spacer(Modifier.height(14.dp))
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

            Spacer(Modifier.height(16.dp))
            SendButton(
                enabled = canSend,
                isUrdu = isUrdu,
                onClick = {
                    scope.launch { prefs.save(name, phone, address) }
                    val bytes = recordedBytes
                    val path = recordedPath
                    if (bytes != null && path != null) {
                        vm.sendRecorded(name, phone, address, bytes, path, elapsedSec, threadId)
                    }
                },
            )

            Spacer(Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LabeledField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isUrdu: Boolean,
    minLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text,
    placeholder: String? = null,
) {
    Column(modifier = Modifier.padding(bottom = 14.dp)) {
        Text(
            label.uppercase(),
            fontFamily = if (isUrdu) NastaleeqFontFamily else null,
            fontSize = if (isUrdu) 13.sp else 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = if (isUrdu) 0.sp else 0.8.sp,
            color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = minLines == 1,
            minLines = minLines,
            shape = RoundedCornerShape(13.dp),
            textStyle = MaterialTheme.typography.bodyLarge.copy(
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
            ),
            placeholder = placeholder?.let {
                {
                    Text(
                        it,
                        fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.7f),
                    )
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedBorderColor = MaterialTheme.colorScheme.tertiary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun RecorderCard(
    isUrdu: Boolean,
    isRecording: Boolean,
    hasRecording: Boolean,
    elapsedSec: Int,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onRerecord: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            val gold = MaterialTheme.colorScheme.tertiary
            Box(
                modifier = Modifier
                    .size(74.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(listOf(gold.copy(alpha = 0.75f), gold))
                    )
                    .clickable {
                        when {
                            isRecording -> onStop()
                            hasRecording -> onRerecord()
                            else -> onStart()
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (isRecording) Icons.Filled.Stop else Icons.Filled.Mic,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onTertiary,
                    modifier = Modifier.size(30.dp),
                )
            }

            val mm = elapsedSec / 60
            val ss = elapsedSec % 60
            Text(
                "%d:%02d".format(mm, ss),
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                when {
                    isRecording -> if (isUrdu) "روکنے کے لیے دبائیں · زیادہ سے زیادہ 5:00" else "Tap to stop · max 5:00"
                    hasRecording -> if (isUrdu) "ریکارڈنگ تیار · دوبارہ کے لیے دبائیں" else "Recording ready · tap to re-record"
                    else -> if (isUrdu) "ریکارڈ کرنے کے لیے دبائیں · زیادہ سے زیادہ 5:00" else "Tap to record · max 5:00"
                },
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontSize = if (isUrdu) 14.sp else 13.sp,
                color = MaterialTheme.colorScheme.secondary,
            )
        }
    }
}

@Composable
private fun PrivacyBanner(text: String, isUrdu: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(11.dp))
            .background(MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f))
            .padding(horizontal = 13.dp, vertical = 11.dp),
    ) {
        Text(
            text,
            fontFamily = if (isUrdu) NastaleeqFontFamily else null,
            fontSize = if (isUrdu) 14.sp else 12.sp,
            lineHeight = if (isUrdu) 24.sp else 17.sp,
            color = MaterialTheme.colorScheme.onTertiaryContainer,
        )
    }
}

@Composable
private fun SendButton(enabled: Boolean, isUrdu: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(15.dp),
        color = if (enabled) MaterialTheme.colorScheme.tertiary
        else MaterialTheme.colorScheme.tertiary.copy(alpha = 0.4f),
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                if (isUrdu) "حضرت کو بھیجیں ←" else "Send to Hazrat →",
                fontFamily = if (isUrdu) NastaleeqFontFamily else null,
                fontSize = if (isUrdu) 16.sp else 15.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = if (isUrdu) 0.sp else 0.4.sp,
                color = MaterialTheme.colorScheme.onTertiary.copy(alpha = if (enabled) 1f else 0.7f),
            )
        }
    }
}
