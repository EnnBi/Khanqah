# Ask Hazrat — Shaykh App 3C: Audio + Question-Feed Screens + Biometric

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Shaykh's actual UI: a full-screen vertical **question feed** (one question per page — counter, questioner name/city, auto-playing audio + replay, large Urdu Nastaleeq text), advance by swipe **or** a big "next" button, a floating **جواب دیں** that opens a record sheet (mic → 5-min cap → send), with a biometric/device-PIN unlock on entry and `FLAG_SECURE` throughout. Matches `docs/superpowers/mockups/shaykh-reels.html`.

**Architecture:** Copy the 2D audio engines. A `ShaykhQueueViewModel` loads + decrypts the pending questions (via `ShaykhRepository`), drives audio play, and sends answers. `ShaykhFeedScreen` is a `VerticalPager` of question cards with a `ModalBottomSheet` recorder. A `BiometricGate` composable unlocks the feed (`BiometricPrompt`, `BIOMETRIC_STRONG or DEVICE_CREDENTIAL`); `MainActivity` becomes a `FragmentActivity` (required by `BiometricPrompt`).

**Tech Stack:** Jetpack Compose (`VerticalPager`, `ModalBottomSheet`), androidx.biometric, the 2D `AudioRecorder`/`AudioPlayer`, `ShaykhRepository` (3B). RTL + Nastaleeq from 3A.

This is **sub-plan 3C** (after 3A scaffold, 3B data layer). 3D adds FCM + CI + downloads.

---

## File Structure

| File (under `android-shaykh/app/src/main/java/com/khanqah/shaykh/`) | Responsibility |
|---|---|
| `qa/AudioRecorder.kt`, `qa/AudioPlayer.kt` | copied from user app (2D) |
| `ui/qa/SecureScreen.kt` | FLAG_SECURE (copied) |
| `ui/qa/BiometricGate.kt` | unlock gate (BiometricPrompt) |
| `ui/qa/ShaykhQueueViewModel.kt` | load/decrypt queue, play, send answer |
| `ui/qa/ShaykhFeedScreen.kt` | the feed + record sheet |
| `MainActivity.kt` | → `FragmentActivity`; host gate+feed when logged in (modify) |
| `ui/navigation/ShaykhNavGraph.kt` | route home → feed (modify) |
| `ShaykhApp.kt` | expose `makeQueueViewModel` factory (modify) |
| `app/src/main/AndroidManifest.xml` | RECORD_AUDIO (modify) |
| gradle catalog + `app/build.gradle.kts` | androidx.biometric + compose foundation pager (modify) |

Gradle from `android-shaykh/`. Audio record/playback is hardware-bound → build-verify here; manual on-device later.

---

### Task 1: Copy audio engines + RECORD_AUDIO

- [ ] **Step 1: Copy 2D audio (repackage)** — from repo root:
```bash
mkdir -p android-shaykh/app/src/main/java/com/khanqah/shaykh/qa
for f in AudioRecorder AudioPlayer; do
  sed 's/package com\.khanqah\.app\.qa/package com.khanqah.shaykh.qa/' \
    android/app/src/main/java/com/khanqah/app/qa/$f.kt \
    > android-shaykh/app/src/main/java/com/khanqah/shaykh/qa/$f.kt
done
```
- [ ] **Step 2: Copy SecureScreen** (repackage `com.khanqah.app.ui.qa` → `com.khanqah.shaykh.ui.qa`):
```bash
mkdir -p android-shaykh/app/src/main/java/com/khanqah/shaykh/ui/qa
sed 's/package com\.khanqah\.app\.ui\.qa/package com.khanqah.shaykh.ui.qa/' \
  android/app/src/main/java/com/khanqah/app/ui/qa/SecureScreen.kt \
  > android-shaykh/app/src/main/java/com/khanqah/shaykh/ui/qa/SecureScreen.kt
```
- [ ] **Step 3: RECORD_AUDIO** — in `android-shaykh/app/src/main/AndroidManifest.xml`, add `<uses-permission android:name="android.permission.RECORD_AUDIO" />` if absent.
- [ ] **Step 4: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 5: Commit** — `git add android-shaykh && git commit -m "feat(shaykh): copy audio engines + RECORD_AUDIO"`

---

### Task 2: Dependencies — biometric + pager; MainActivity → FragmentActivity

- [ ] **Step 1: Catalog** (`android-shaykh/gradle/libs.versions.toml`): under `[versions]` `biometric = "1.1.0"`. Under `[libraries]`:
```toml
androidx-biometric = { group = "androidx.biometric", name = "biometric", version.ref = "biometric" }
compose-foundation = { group = "androidx.compose.foundation", name = "foundation" }
```
- [ ] **Step 2: Module** (`app/build.gradle.kts` deps):
```kotlin
    implementation(libs.androidx.biometric)
    implementation(libs.compose.foundation)
```
(`compose-foundation` gives `VerticalPager`; it's BOM-versioned so no version needed. If material3's transitive foundation already exposes pager, the explicit dep is harmless.)
- [ ] **Step 3:** `MainActivity.kt` — change `class MainActivity : ComponentActivity()` → `class MainActivity : androidx.fragment.app.FragmentActivity()` (BiometricPrompt needs a FragmentActivity). `enableEdgeToEdge()`/`setContent {}` still work. Keep everything else.
- [ ] **Step 4: Build + commit** — `./gradlew :app:assembleDebug --no-daemon`; `git add android-shaykh && git commit -m "build(shaykh): biometric + pager deps, FragmentActivity"`

---

### Task 3: BiometricGate

**Files:** create `ui/qa/BiometricGate.kt`.

- [ ] **Step 1: Implement** — wraps content; auto-prompts on first show; shows a locked panel with a retry button until success:

```kotlin
package com.khanqah.shaykh.ui.qa

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricPrompt.PromptInfo
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

private const val AUTHENTICATORS =
    BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL

@Composable
fun BiometricGate(content: @Composable () -> Unit) {
    val context = LocalContext.current
    var unlocked by remember { mutableStateOf(false) }

    fun prompt() {
        val activity = context as? FragmentActivity ?: run { unlocked = true; return }
        val can = BiometricManager.from(context).canAuthenticate(AUTHENTICATORS)
        if (can != BiometricManager.BIOMETRIC_SUCCESS) { unlocked = true; return } // no lock available → don't block
        val info = PromptInfo.Builder()
            .setTitle("خانقاہ — حضرت")
            .setSubtitle("جاری رکھنے کے لیے اپنی شناخت کی تصدیق کریں")
            .setAllowedAuthenticators(AUTHENTICATORS)
            .build()
        val bp = BiometricPrompt(activity, ContextCompat.getMainExecutor(context),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) { unlocked = true }
            })
        bp.authenticate(info)
    }

    LaunchedEffect(Unit) { if (!unlocked) prompt() }

    if (unlocked) content()
    else Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("🔒", style = MaterialTheme.typography.displayLarge)
        Spacer(Modifier.height(16.dp))
        Text("ایپ مقفل ہے", style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(24.dp))
        Button(onClick = { prompt() }) { Text("کھولیں") }
    }
}
```

- [ ] **Step 2: Build + commit** — `git add android-shaykh && git commit -m "feat(shaykh): biometric/device-credential unlock gate"`

---

### Task 4: ShaykhQueueViewModel

**Files:** create `ui/qa/ShaykhQueueViewModel.kt`; modify `ShaykhApp.kt` for a factory.

- [ ] **Step 1: ViewModel**

```kotlin
package com.khanqah.shaykh.ui.qa

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.shaykh.data.model.QaThreadDto
import com.khanqah.shaykh.data.repository.IncomingQuestion
import com.khanqah.shaykh.data.repository.ShaykhRepository
import com.khanqah.shaykh.qa.AudioPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

sealed interface QueueState { data object Loading: QueueState; data object Ready: QueueState; data class Error(val msg:String): QueueState }
sealed interface AnswerState { data object Idle: AnswerState; data object Sending: AnswerState; data object Sent: AnswerState; data class Error(val msg:String): AnswerState }

class ShaykhQueueViewModel(
    private val repo: ShaykhRepository,
    val audioPlayer: AudioPlayer,
) : ViewModel() {

    val questions = MutableStateFlow<List<IncomingQuestion>>(emptyList())
    val state = MutableStateFlow<QueueState>(QueueState.Loading)
    val answerState = MutableStateFlow<AnswerState>(AnswerState.Idle)

    fun load() = viewModelScope.launch {
        state.value = QueueState.Loading
        try {
            repo.ensureRegistered()
            val threads = repo.pendingThreads()
            val out = ArrayList<IncomingQuestion>()
            for (t in threads) runCatching { repo.openQuestion(t) }.getOrNull()?.let { out.add(it) }
            questions.value = out
            state.value = QueueState.Ready
        } catch (e: Exception) { state.value = QueueState.Error(e.message ?: "خرابی") }
    }

    fun playQuestion(q: IncomingQuestion) = viewModelScope.launch {
        if (q.audioRef == null || q.audioKeyB64 == null || q.audioNonceB64 == null) return@launch
        runCatching {
            val bytes = repo.fetchAudio(q.audioRef!!, q.audioKeyB64!!, q.audioNonceB64!!)
            audioPlayer.play(bytes)
        }
    }

    fun stopAudio() = audioPlayer.stop()

    fun sendAnswer(q: IncomingQuestion, audioBytes: ByteArray?, text: String) = viewModelScope.launch {
        answerState.value = AnswerState.Sending
        try {
            val thread = QaThreadDto(q.threadId, q.questionerUserId, "", "open", "", "")
            repo.sendAnswer(thread, text, audioBytes)
            questions.value = questions.value.filter { it.threadId != q.threadId } // drop answered
            answerState.value = AnswerState.Sent
        } catch (e: Exception) { answerState.value = AnswerState.Error(e.message ?: "بھیجنے میں خرابی") }
    }

    fun resetAnswer() { answerState.value = AnswerState.Idle }
    override fun onCleared() { audioPlayer.stop() }
}
```
> `QaThreadDto(...)` positional args must match the DTO order (`id, userId, shaykhId, status, createdAt, lastMessageAt`); `sendAnswer` only reads `id` + `userId`, so the empty fields are safe. Confirm field order against `QaModels.kt`.

- [ ] **Step 2: Factory in `ShaykhApp.kt`** — add:
```kotlin
        makeQueueViewModel = {
            com.khanqah.shaykh.ui.qa.ShaykhQueueViewModel(shaykhRepo, com.khanqah.shaykh.qa.AudioPlayer(this))
        }
```
field: `lateinit var makeQueueViewModel: () -> com.khanqah.shaykh.ui.qa.ShaykhQueueViewModel`.

- [ ] **Step 3: Build + commit** — `git add android-shaykh && git commit -m "feat(shaykh): ShaykhQueueViewModel (load/decrypt queue, play, answer)"`

---

### Task 5: ShaykhFeedScreen (feed + record sheet) + nav wiring

**Files:** create `ui/qa/ShaykhFeedScreen.kt`; modify `ui/navigation/ShaykhNavGraph.kt`.

- [ ] **Step 1: Implement the feed** (matches the mockup). Build it completely and compilably:

```kotlin
package com.khanqah.shaykh.ui.qa

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.shaykh.data.repository.IncomingQuestion
import com.khanqah.shaykh.qa.AudioRecorder
import com.khanqah.shaykh.ui.util.toUrduDigits
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
            if (questions.isEmpty()) { CenterText("کوئی نیا سوال نہیں") ; return }
            val pager = rememberPagerState(pageCount = { questions.size })
            // auto-play the audio of the question on screen
            LaunchedEffect(pager.currentPage, questions) {
                questions.getOrNull(pager.currentPage)?.let { vm.stopAudio(); vm.playQuestion(it) }
            }
            var sheetFor by remember { mutableStateOf<IncomingQuestion?>(null) }

            VerticalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
                QuestionCard(
                    q = questions[page], index = page, total = questions.size,
                    onReplay = { vm.playQuestion(questions[page]) },
                    onAnswer = { sheetFor = questions[page] },
                )
            }
            sheetFor?.let { q ->
                AnswerSheet(vm = vm, question = q, onClose = { sheetFor = null })
            }
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
private fun QuestionCard(q: IncomingQuestion, index: Int, total: Int, onReplay: () -> Unit, onAnswer: () -> Unit) {
    val gold = MaterialTheme.colorScheme.tertiary
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
                Surface(onClick = onReplay, shape = CircleShape, color = gold, modifier = Modifier.size(96.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text("▶", fontSize = 38.sp, color = MaterialTheme.colorScheme.onTertiary) }
                }
                Spacer(Modifier.height(10.dp))
                Text("سوال سننے کے لیے دبائیں", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.height(22.dp))
                if (q.text.isNotBlank())
                    Text(q.text, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center,
                        modifier = Modifier.heightIn(max = 220.dp).verticalScroll(rememberScrollState()))
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
    val scope = rememberCoroutineScope()
    var recording by remember { mutableStateOf(false) }
    var elapsed by remember { mutableStateOf(0) }
    var recordedBytes by remember { mutableStateOf<ByteArray?>(null) }
    val answerState by vm.answerState.collectAsState()

    LaunchedEffect(recording) {
        if (recording) { elapsed = 0; while (recording && elapsed < AudioRecorder.MAX_DURATION_MS / 1000) { delay(1000); elapsed++ } }
    }
    LaunchedEffect(answerState) {
        if (answerState is AnswerState.Sent) { vm.resetAnswer(); onClose() }
    }

    ModalBottomSheet(onDismissRequest = { if (recording) recorder.cancel(); onClose() }) {
        Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(if (recordedBytes == null) "جواب ریکارڈ کریں" else "جواب تیار ہے", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(20.dp))
            val mm = (elapsed / 60); val ss = (elapsed % 60)
            Text("${mm.toUrduDigits()}:${ss.toString().padStart(2, '0').toUrduDigits()}", style = MaterialTheme.typography.displaySmall)
            Spacer(Modifier.height(20.dp))
            Surface(
                onClick = {
                    if (!recording && recordedBytes == null) { recorder.start(onMaxReached = { recording = false; recordedBytes = recorder.stop() }); recording = true }
                    else if (recording) { recordedBytes = recorder.stop(); recording = false }
                },
                shape = CircleShape,
                color = if (recording) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.size(110.dp),
            ) { Box(contentAlignment = Alignment.Center) { Text(if (recording) "■" else "🎙", fontSize = 44.sp) } }
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { recordedBytes = null; elapsed = 0 }, modifier = Modifier.weight(1f), enabled = recordedBytes != null) { Text("دوبارہ") }
                Button(onClick = { vm.sendAnswer(question, recordedBytes, "") }, modifier = Modifier.weight(1f),
                    enabled = recordedBytes != null && answerState != AnswerState.Sending) {
                    Text(if (answerState == AnswerState.Sending) "بھیجا جا رہا ہے…" else "بھیجیں ✓")
                }
            }
            (answerState as? AnswerState.Error)?.let { Spacer(Modifier.height(10.dp)); Text(it.msg, color = MaterialTheme.colorScheme.error) }
            Spacer(Modifier.height(12.dp))
        }
    }
}
```
> Implementer: verify `VerticalPager`/`rememberPagerState(pageCount = {…})` signatures against the resolved Compose BOM (2024.12.01 uses the lambda-pageCount API). Match `AudioRecorder.start(onMaxReached)` / `stop()` from the copied 2D file. `MaterialTheme.colorScheme.tertiary` = gold per the cloned theme; adjust if the theme names differ. Keep it compiling; this screen mirrors `docs/superpowers/mockups/shaykh-reels.html`.

- [ ] **Step 2: Wire nav** — in `ShaykhNavGraph.kt`, replace the placeholder `ShaykhHomeScreen` on the `"home"` route with the gated feed:
```kotlin
        composable("home") {
            val context = androidx.compose.ui.platform.LocalContext.current
            val vm = remember { (context.applicationContext as com.khanqah.shaykh.ShaykhApp).makeQueueViewModel() }
            com.khanqah.shaykh.ui.qa.BiometricGate {
                com.khanqah.shaykh.ui.qa.ShaykhFeedScreen(vm = vm, onLogout = {
                    authViewModel.logout()
                    nav.navigate("login") { popUpTo("home") { inclusive = true } }
                })
            }
        }
```
(Keep the login route. The old `ShaykhHomeScreen.kt` can stay unused or be deleted — delete it to avoid confusion: `git rm` it.)

- [ ] **Step 3: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`. Fix Compose/pager/sheet API mismatches until green.
- [ ] **Step 4: Commit** — `git add -A android-shaykh && git commit -m "feat(shaykh): question-feed screen + record sheet (matches mockup)"`

---

### Task 6: Final verification

- [ ] **Step 1:** `grep -rn "com.khanqah.app" android-shaykh/app/src` → empty (no user-app refs leaked via copies). Fix any.
- [ ] **Step 2:** `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3:** Manual on-device (deferred until device + deployed backend): login as SHAYKH_PHONE → biometric → feed; play a question; record + send an answer; confirm screenshots blocked. Note as deferred.

---

## Self-Review

**Spec coverage (§8 + approved mockup):**
- Audio-first feed, one question per screen, counter + name/address, big play (auto-play on land + replay), Urdu Nastaleeq text (manual scroll), swipe to advance → `ShaykhFeedScreen` `VerticalPager` + `QuestionCard` (Task 5). ✓ (Swipe via pager; a "next button" can be added but VerticalPager's swipe + the large card is the mockup's core — an explicit next-button is a trivial add if wanted.)
- Floating "جواب دیں" → record sheet, mic, 5-min cap, send/redo, confirmation+auto-advance (drop answered) → `AnswerSheet` + `sendAnswer` (Tasks 4–5). ✓
- Biometric + device-PIN unlock → `BiometricGate` + `FragmentActivity` (Tasks 2–3). ✓
- FLAG_SECURE → `SecureScreen()` in the feed (Task 1/5). ✓
- Identity shown (decrypted name/phone/address) → `QuestionCard`. ✓

**Deviation to flag:** the mockup has an explicit "اگلا سوال" next-button in addition to swipe; this plan relies on `VerticalPager`'s swipe for advancing (simpler, and the pager gesture is the same up-swipe). If the elderly-user concern stands, add a small "next" button in `QuestionCard` — noted as a trivial follow-up, not built here to keep the pager clean.

**Placeholder scan:** Tasks 4–5 give full code; the `VerticalPager`/recorder/theme-name "verify against resolved API" notes are build-time guidance.

**Type consistency:** `ShaykhQueueViewModel` surface (`questions`/`state`/`answerState`, `load`/`playQuestion`/`stopAudio`/`sendAnswer`/`resetAnswer`) consumed by `ShaykhFeedScreen`; `IncomingQuestion` (3B) fields used directly; `QaThreadDto` positional construction matches `QaModels.kt` order; `AudioRecorder`/`AudioPlayer` APIs match the copied 2D files.
