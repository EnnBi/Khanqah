# Ask Hazrat — User App 2E: Screens, Nav, Local Cache

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The user-facing Ask Hazrat experience in the native Kotlin app (`android/`): a thread list, a compose screen (identity + text/audio question, Urdu pre-render, 5-min recording), and a WhatsApp-style conversation that merges the user's locally-cached questions with the Shaykh's decrypted answers. Wire it into navigation behind an auth gate, replacing the "Coming Soon" tile, with `FLAG_SECURE` on every QA screen.

**Architecture:** A Room table (`sent_questions`) persists the plaintext of each question we send (required — see §6a; we can't decrypt our own questions back). A `QaViewModel` composes the 2A–2D pieces (`QaRepository`, `UrduPipeline`, `AudioRecorder`, `AudioPlayer`) + the cache into UI state. Three Compose screens render it, following the app's existing theme (`MaterialTheme.colorScheme`, `NastaleeqFontFamily`, `LocalIsUrdu`) and nav patterns (`Screen` sealed class + `AppNavGraph`).

**Tech Stack:** Jetpack Compose, Room (existing `AppDatabase`), Kotlin coroutines/Flow, the 2A–2D classes, `ActivityResultContracts.RequestPermission` (RECORD_AUDIO), `window.setFlags(FLAG_SECURE)`.

This is **sub-plan 2E** (after 2A–2D). **Biometric unlock + content-free push deep-linking are Plan 2F** (separate). Recorded-voice questions are sent as-is; typed questions go through 2C's Urdu pipeline.

---

## Prerequisites already built (2A–2D)
- `QaRepository`: `ensureRegistered()`, `shaykhPublicKey()` (throws `ShaykhKeyChangedException`), `sendTextQuestion(name,phone,address,urduText,threadId?)→SendMessageResponse`, `sendAudioQuestion(name,phone,address,urduTranscript,audioBytes,threadId?)→SendMessageResponse`, `listThreads()→List<QaThreadDto>`, `threadMessages(threadId)→List<DecryptedMessage>` (answers decrypted; our questions blank), `fetchAudio(ref,key,nonce)→ByteArray`, `markRead(id)`.
- `UrduPipeline.prepare(typed)→PreparedQuestion(urduText, audioBytes?)`, `canSpeakUrdu()`.
- `AudioRecorder(context)`: `start(onMaxReached)→File`, `stop()→ByteArray?`, `cancel()`; `MAX_DURATION_MS`.
- `AudioPlayer(context)`: `play(bytes,onComplete)`, `stop()`, `isPlaying`.
- `KhanqahApp.qaRepo` exists; app already has `AppDatabase` (Room), `TokenManager` (`getUserId`, `getDisplayName`, `getPhone`), `NastaleeqFontFamily`, `LocalIsUrdu`, `Screen`/`AppNavGraph`, `HomeScreen` Ask Hazrat tile calling `onComingSoonClick("Ask Hazrat")`.

---

## File Structure

| File | Responsibility |
|---|---|
| `…/data/db/entities/SentQuestionEntity.kt` | Room entity: locally-cached sent question |
| `…/data/db/SentQuestionDao.kt` | DAO for the cache |
| `…/data/db/AppDatabase.kt` | Register entity + DAO, bump version (modify) |
| `…/ui/qa/QaViewModel.kt` | State + actions composing repo/pipeline/audio/cache |
| `…/ui/qa/AskThreadListScreen.kt` | Thread list + "Ask new" |
| `…/ui/qa/AskComposeScreen.kt` | Identity + text/audio question compose |
| `…/ui/qa/AskConversationScreen.kt` | WhatsApp-style thread view |
| `…/ui/qa/QaPrefs.kt` | Local cache of identity (name/phone/address) for prefill |
| `…/ui/navigation/AppNavGraph.kt` | Routes + auth gate + replace tile (modify) |
| `…/ui/home/HomeScreen.kt` | Ask Hazrat tile → `/ask` (modify) |
| `…/KhanqahApp.kt` | Expose `qaViewModel` factory / deps (modify) |

All commands from `android/`. Match the existing screens' structure (see `ui/library/LibraryScreen.kt`, `ui/home/HomeScreen.kt`) for top bars, padding, theme usage.

---

### Task 1: Room sent-question cache

**Files:** Create `SentQuestionEntity.kt`, `SentQuestionDao.kt`; modify `AppDatabase.kt`.

- [ ] **Step 1: Entity** — `android/app/src/main/java/com/khanqah/app/data/db/entities/SentQuestionEntity.kt`:

```kotlin
package com.khanqah.app.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Plaintext of a question we sent — kept locally so the conversation shows our own side
 *  (questions are sealed to the Shaykh and can't be decrypted back from the server). */
@Entity(tableName = "sent_questions")
data class SentQuestionEntity(
    @PrimaryKey val messageId: String,
    val threadId: String,
    val text: String,            // Urdu text we sent
    val audioPath: String?,      // local file path of our recorded/synth audio, if any
    val createdAt: Long,
)
```

- [ ] **Step 2: DAO** — `android/app/src/main/java/com/khanqah/app/data/db/SentQuestionDao.kt`:

```kotlin
package com.khanqah.app.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.khanqah.app.data.db.entities.SentQuestionEntity

@Dao
interface SentQuestionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(q: SentQuestionEntity)

    @Query("SELECT * FROM sent_questions WHERE threadId = :threadId")
    suspend fun forThread(threadId: String): List<SentQuestionEntity>

    @Query("SELECT * FROM sent_questions WHERE messageId = :id LIMIT 1")
    suspend fun byId(id: String): SentQuestionEntity?
}
```

- [ ] **Step 3: Register in `AppDatabase.kt`** — read the file first. Add `SentQuestionEntity::class` to the `@Database(entities = [...])` array, **increment the `version`**, add an abstract `fun sentQuestionDao(): SentQuestionDao`. Since the app uses Room with existing content/category caches, use `.fallbackToDestructiveMigration()` in the builder if it's already there (a cache DB — destructive is fine); if the builder does NOT already allow destructive migration, add `.fallbackToDestructiveMigration()` (the cache is rebuildable from the API). Report which you did.

- [ ] **Step 4: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL` (KSP regenerates Room code).
- [ ] **Step 5: Commit** — `git add …/SentQuestionEntity.kt …/SentQuestionDao.kt …/AppDatabase.kt && git commit -m "feat(android): Room cache for sent questions"`

---

### Task 2: Identity prefill store

**Files:** Create `android/app/src/main/java/com/khanqah/app/ui/qa/QaPrefs.kt`.

- [ ] **Step 1: Implement** (address isn't on the server — cache all three for prefill):

```kotlin
package com.khanqah.app.ui.qa

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.qaProfileStore by preferencesDataStore("qa_profile")

/** Caches the questioner's identity (name/phone/address) for prefill. Address lives only here
 *  (never on the server); name/phone seed from the auth profile but stay editable. */
class QaPrefs(private val context: Context) {
    private val NAME = stringPreferencesKey("name")
    private val PHONE = stringPreferencesKey("phone")
    private val ADDRESS = stringPreferencesKey("address")

    suspend fun load(): Triple<String, String, String> {
        val p = context.qaProfileStore.data.first()
        return Triple(p[NAME] ?: "", p[PHONE] ?: "", p[ADDRESS] ?: "")
    }
    suspend fun save(name: String, phone: String, address: String) {
        context.qaProfileStore.edit { it[NAME] = name; it[PHONE] = phone; it[ADDRESS] = address }
    }
}
```

- [ ] **Step 2: Build + commit** — `git add …/QaPrefs.kt && git commit -m "feat(android): qa identity prefill store"`

---

### Task 3: QaViewModel

**Files:** Create `android/app/src/main/java/com/khanqah/app/ui/qa/QaViewModel.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.ui.qa

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.db.SentQuestionDao
import com.khanqah.app.data.db.entities.SentQuestionEntity
import com.khanqah.app.data.model.QaThreadDto
import com.khanqah.app.data.repository.DecryptedMessage
import com.khanqah.app.data.repository.QaRepository
import com.khanqah.app.data.repository.ShaykhKeyChangedException
import com.khanqah.app.qa.AudioPlayer
import com.khanqah.app.qa.UrduPipeline
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/** A message row for the conversation UI (questions from local cache, answers decrypted). */
data class ChatItem(
    val id: String,
    val fromMe: Boolean,          // true = our question
    val text: String,
    val hasAudio: Boolean,
    val audioRef: String?, val audioKeyB64: String?, val audioNonceB64: String?,
    val localAudioPath: String?,  // our own question audio
    val createdAtIso: String,
    val read: Boolean,
)

sealed interface SendState {
    data object Idle : SendState
    data object Preparing : SendState   // translating + synthesizing
    data object Sending : SendState
    data class Error(val message: String) : SendState
    data object Sent : SendState
}

class QaViewModel(
    private val repo: QaRepository,
    private val pipeline: UrduPipeline,
    private val dao: SentQuestionDao,
    val audioPlayer: AudioPlayer,
) : ViewModel() {

    val threads = MutableStateFlow<List<QaThreadDto>>(emptyList())
    val messages = MutableStateFlow<List<ChatItem>>(emptyList())
    val sendState: MutableStateFlow<SendState> = MutableStateFlow(SendState.Idle)

    fun loadThreads() = viewModelScope.launch {
        runCatching { repo.listThreads() }.onSuccess { threads.value = it }
    }

    fun loadMessages(threadId: String) = viewModelScope.launch {
        val server = runCatching { repo.threadMessages(threadId) }.getOrDefault(emptyList())
        val cached = dao.forThread(threadId).associateBy { it.messageId }
        messages.value = server.map { m -> toChatItem(m, cached[m.id]) }
        // mark unread answers read
        server.filter { it.direction == "a" && it.readAt == null }.forEach { runCatching { repo.markRead(it.id) } }
    }

    private fun toChatItem(m: DecryptedMessage, cache: SentQuestionEntity?): ChatItem {
        val fromMe = m.direction == "q"
        return ChatItem(
            id = m.id, fromMe = fromMe,
            text = if (fromMe) (cache?.text ?: "") else m.text,
            hasAudio = if (fromMe) (cache?.audioPath != null) else (m.audioRef != null),
            audioRef = m.audioRef, audioKeyB64 = m.audioKeyB64, audioNonceB64 = m.audioNonceB64,
            localAudioPath = cache?.audioPath,
            createdAtIso = m.createdAt, read = m.readAt != null,
        )
    }

    /** Send a typed question: translate→Urdu (+TTS audio if available), encrypt, send, cache. */
    fun sendTyped(name: String, phone: String, address: String, typed: String, threadId: String?) =
        viewModelScope.launch {
            try {
                sendState.value = SendState.Preparing
                val prepared = pipeline.prepare(typed)
                sendState.value = SendState.Sending
                val resp = if (prepared.audioBytes != null)
                    repo.sendAudioQuestion(name, phone, address, prepared.urduText, prepared.audioBytes!!, threadId)
                else
                    repo.sendTextQuestion(name, phone, address, prepared.urduText, threadId)
                dao.upsert(SentQuestionEntity(resp.id, resp.threadId, prepared.urduText, null, nowMillis()))
                sendState.value = SendState.Sent
            } catch (e: ShaykhKeyChangedException) {
                sendState.value = SendState.Error("Hazrat's security key changed. Please contact support before sending.")
            } catch (e: Exception) {
                sendState.value = SendState.Error(e.message ?: "Failed to send")
            }
        }

    /** Send a recorded voice question (sent as-is; no translation). [audioPath] cached for replay. */
    fun sendRecorded(name: String, phone: String, address: String, audioBytes: ByteArray, audioPath: String, threadId: String?) =
        viewModelScope.launch {
            try {
                sendState.value = SendState.Sending
                val resp = repo.sendAudioQuestion(name, phone, address, "", audioBytes, threadId)
                dao.upsert(SentQuestionEntity(resp.id, resp.threadId, "", audioPath, nowMillis()))
                sendState.value = SendState.Sent
            } catch (e: ShaykhKeyChangedException) {
                sendState.value = SendState.Error("Hazrat's security key changed. Please contact support before sending.")
            } catch (e: Exception) {
                sendState.value = SendState.Error(e.message ?: "Failed to send")
            }
        }

    fun playAnswerAudio(item: ChatItem) = viewModelScope.launch {
        runCatching {
            val bytes = if (item.fromMe && item.localAudioPath != null)
                java.io.File(item.localAudioPath).readBytes()
            else
                repo.fetchAudio(item.audioRef!!, item.audioKeyB64!!, item.audioNonceB64!!)
            audioPlayer.play(bytes)
        }
    }

    fun resetSend() { sendState.value = SendState.Idle }

    override fun onCleared() { audioPlayer.stop() }

    private fun nowMillis(): Long = System.currentTimeMillis()
}
```

> Note: `System.currentTimeMillis()` is fine in app runtime (the no-`Date.now()` rule applies to workflow scripts, not app code).

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/QaViewModel.kt && git commit -m "feat(android): QaViewModel composing repo/pipeline/audio/cache"`

---

### Task 4: Wire deps in KhanqahApp + a ViewModel factory

**Files:** Modify `android/app/src/main/java/com/khanqah/app/KhanqahApp.kt`.

- [ ] **Step 1:** In `onCreate()` keep the existing `qaRepo`. Add the extra deps and a factory:

```kotlin
        val urduPipeline = com.khanqah.app.qa.UrduPipeline(this)
        val sentQuestionDao = db.sentQuestionDao()
        makeQaViewModel = {
            com.khanqah.app.ui.qa.QaViewModel(
                qaRepo, urduPipeline, sentQuestionDao, com.khanqah.app.qa.AudioPlayer(this)
            )
        }
```

Add field: `lateinit var makeQaViewModel: () -> com.khanqah.app.ui.qa.QaViewModel`. (`db` is the `AppDatabase` already created in `onCreate`.)

- [ ] **Step 2: Build + commit** — `git add …/KhanqahApp.kt && git commit -m "feat(android): provide QaViewModel factory"`

---

### Task 5: Navigation + auth gate + home tile

**Files:** Modify `…/ui/navigation/AppNavGraph.kt`, `…/ui/home/HomeScreen.kt`.

- [ ] **Step 1: Add routes** to the `Screen` sealed class:

```kotlin
    object AskList : Screen("ask")
    object AskCompose : Screen("ask/compose?threadId={threadId}") {
        fun route(threadId: String? = null) = if (threadId == null) "ask/compose" else "ask/compose?threadId=$threadId"
    }
    object AskConversation : Screen("ask/thread/{threadId}") {
        fun route(threadId: String) = "ask/thread/$threadId"
    }
```

- [ ] **Step 2: Add composables** in the `NavHost`. Auth gate: if not logged in, route to `Screen.Login`. Construct the VM once via the app factory and share across the three screens:

```kotlin
            composable(Screen.AskList.route) {
                if (!isLoggedIn) { LaunchedEffect(Unit) { navController.navigate(Screen.Login.route) }; return@composable }
                val vm = remember { (context.applicationContext as KhanqahApp).makeQaViewModel() }
                AskThreadListScreen(
                    vm = vm,
                    onAskNew = { navController.navigate(Screen.AskCompose.route()) },
                    onOpenThread = { navController.navigate(Screen.AskConversation.route(it)) },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.AskCompose.route) { back ->
                val threadId = back.arguments?.getString("threadId")
                val vm = remember { (context.applicationContext as KhanqahApp).makeQaViewModel() }
                AskComposeScreen(vm = vm, threadId = threadId, onSent = { navController.popBackStack() }, onBack = { navController.popBackStack() })
            }
            composable(Screen.AskConversation.route) { back ->
                val threadId = back.arguments?.getString("threadId") ?: return@composable
                val vm = remember { (context.applicationContext as KhanqahApp).makeQaViewModel() }
                AskConversationScreen(vm = vm, threadId = threadId, onFollowUp = { navController.navigate(Screen.AskCompose.route(threadId)) }, onBack = { navController.popBackStack() })
            }
```

> `context` and `isLoggedIn` are already in scope in `AppNavGraph` (used elsewhere). Add the needed imports for the new screens and `LaunchedEffect`/`remember`. Declare nav args for `threadId` where used (optional string for compose, path string for conversation) following how `Player`/`CategoryDetail` declare arguments in this file.

- [ ] **Step 3: Home tile** — in `…/ui/home/HomeScreen.kt` (~line 223) change the Ask Hazrat tile from `{ onComingSoonClick("Ask Hazrat") }` to a new `onAskHazrat` callback, and thread `onAskHazrat` from the nav graph to `navController.navigate(Screen.AskList.route)`. (Add `onAskHazrat: () -> Unit = {}` param to `HomeScreen`, pass it where `HomeScreen` is composed in `AppNavGraph`.)

- [ ] **Step 4: Build + commit** — `git add …/AppNavGraph.kt …/ui/home/HomeScreen.kt && git commit -m "feat(android): ask hazrat nav routes + auth gate + home tile"` (build will fail until Tasks 6–8 add the screens — so do Step 4 AFTER Tasks 6–8, or stub the screens first. Recommended order: implement Tasks 6,7,8 then build+commit Task 5 together. Adjust commits accordingly.)

> **Ordering note:** Tasks 5–8 are interdependent (nav references the screens). Implement the three screen composables (Tasks 6–8) first, then wire nav (Task 5), then do a single build. Commit screens individually; commit the nav+home wiring last.

---

### Task 6: Thread list screen

**Files:** Create `android/app/src/main/java/com/khanqah/app/ui/qa/AskThreadListScreen.kt`.

- [ ] **Step 1: Implement** a screen that: applies `FLAG_SECURE` (see Task 9 helper), loads threads on launch, shows a top bar titled (Urdu "حضرت سے سوال" when `LocalIsUrdu`, else "Ask Hazrat"), a list of threads (status chip Pending/Answered from `status`, last-activity time), a prominent "Ask a new question" button, and an empty state. Use `MaterialTheme.colorScheme`, `NastaleeqFontFamily` for Urdu text, and match `LibraryScreen` structure.

```kotlin
package com.khanqah.app.ui.qa

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.app.ui.utils.LocalIsUrdu

@Composable
fun AskThreadListScreen(
    vm: QaViewModel,
    onAskNew: () -> Unit,
    onOpenThread: (String) -> Unit,
    onBack: () -> Unit,
) {
    SecureScreen()
    val ur = LocalIsUrdu.current
    val threads by vm.threads.collectAsState()
    LaunchedEffect(Unit) { vm.loadThreads() }

    Scaffold(
        topBar = { TopAppBar(title = { Text(if (ur) "حضرت سے سوال" else "Ask Hazrat") }) },
        floatingActionButton = { ExtendedFloatingActionButton(onClick = onAskNew, text = { Text(if (ur) "نیا سوال" else "Ask a new question") }, icon = {}) },
    ) { pad ->
        if (threads.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                Text(if (ur) "ابھی تک کوئی سوال نہیں" else "No questions yet")
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(pad)) {
                items(threads) { t ->
                    ListItem(
                        headlineContent = { Text(if (t.status == "answered") (if (ur) "جواب موصول" else "Answered") else (if (ur) "زیرِ غور" else "Pending")) },
                        supportingContent = { Text(t.lastMessageAt) },
                        modifier = Modifier.clickable { onOpenThread(t.id) },
                    )
                }
            }
        }
    }
}
```

- [ ] **Step 2:** (build deferred to Task 5 final build)
- [ ] **Step 3: Commit** — `git add …/AskThreadListScreen.kt && git commit -m "feat(android): ask hazrat thread list screen"`

---

### Task 7: Compose (ask) screen

**Files:** Create `android/app/src/main/java/com/khanqah/app/ui/qa/AskComposeScreen.kt`.

- [ ] **Step 1: Implement** — fields: Name, Phone, Address (prefilled via `QaPrefs`, required), a Text/Audio toggle. Text mode: a multiline field. Audio mode: a record/stop button with a live countdown to 5:00 (use `AudioRecorder`; request `RECORD_AUDIO` via `rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission())`). On send: save identity to `QaPrefs`; for text → `vm.sendTyped(...)`; for audio → write recorded bytes to a cache file and `vm.sendRecorded(...)`. Observe `vm.sendState`: show a "Preparing… / Sending…" indicator, error snackbar, and on `Sent` call `onSent()`. Apply `SecureScreen()`. Show the privacy notice. Use Urdu strings when `LocalIsUrdu`.

```kotlin
// Full implementation: identity TextFields, mode toggle (SegmentedButton), text field OR
// record UI with a 0:00→5:00 countdown driven by a LaunchedEffect timer while recording,
// RECORD_AUDIO permission launcher, send button gated on required fields, and a
// LaunchedEffect(sendState) that pops on Sent and shows errors. Build it following the
// app's existing form patterns (see admin upload screen in android-admin for a Compose
// form + progress reference). Keep identity fields prefilled from QaPrefs.load().
```

> This screen has the most moving parts. Implement it completely and compilably; match existing Compose form styling. Enforce required Name/Phone/Address before enabling Send. The 5-minute cap is enforced by `AudioRecorder` (auto-stop via `onMaxReached` → flip UI to "recorded"); the countdown is display only.

- [ ] **Step 2:** (build deferred to Task 5 final build)
- [ ] **Step 3: Commit** — `git add …/AskComposeScreen.kt && git commit -m "feat(android): ask hazrat compose screen (text/audio, identity, 5-min)"`

---

### Task 8: Conversation screen (WhatsApp-style)

**Files:** Create `android/app/src/main/java/com/khanqah/app/ui/qa/AskConversationScreen.kt`.

- [ ] **Step 1: Implement** — `LaunchedEffect(threadId) { vm.loadMessages(threadId) }`; render `vm.messages` as chat bubbles: our questions (`fromMe`) right-aligned, the Shaykh's answers left-aligned; each bubble shows text (Urdu in `NastaleeqFontFamily`) and/or a ▶ play button for audio (`vm.playAnswerAudio(item)`); show a timestamp per bubble and date separators between days (parse `createdAtIso`). A "follow-up" button → `onFollowUp()`. Apply `SecureScreen()`. RTL-aware alignment via `LocalIsUrdu`/`LocalLayoutDirection`.

```kotlin
// Full implementation: LazyColumn of bubbles with Surface(shape=RoundedCornerShape) tinted
// by colorScheme (ours = primary container, Shaykh = surfaceVariant/gold accent), Arrangement
// by fromMe, an inline IconButton(PlayArrow) when hasAudio, Text with NastaleeqFontFamily for
// Urdu, a small timestamp Text, and date-separator rows. Mark-read happens in vm.loadMessages.
// Follow the chat-bubble idiom; keep it clean and readable.
```

- [ ] **Step 2:** (build deferred to Task 5 final build)
- [ ] **Step 3: Commit** — `git add …/AskConversationScreen.kt && git commit -m "feat(android): ask hazrat conversation screen (whatsapp-style)"`

---

### Task 9: FLAG_SECURE helper + final integration build

**Files:** Create `android/app/src/main/java/com/khanqah/app/ui/qa/SecureScreen.kt`; then build everything.

- [ ] **Step 1: SecureScreen composable** — sets `FLAG_SECURE` while any QA screen is shown and clears it on dispose:

```kotlin
package com.khanqah.app.ui.qa

import android.app.Activity
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext

/** Blocks screenshots / recents preview while a QA screen is visible. */
@Composable
fun SecureScreen() {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }
}
```

- [ ] **Step 2: Full build** — `./gradlew :app:assembleDebug --no-daemon`. Fix any wiring/compile errors across Tasks 5–9 until `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/SecureScreen.kt && git commit -m "feat(android): FLAG_SECURE on qa screens"` (plus the Task 5 nav/home commit now that it compiles).

- [ ] **Step 4: Manual on-device verification (when device available)** — install, open Ask Hazrat (must require login), submit a text question (verify it appears in the thread), submit a 10-second voice question, and confirm screenshots are blocked. Note results; defer if no device.

---

## Self-Review

**Spec coverage (§6a, §8, §9):**
- Auth required (no guest) → Task 5 gate. ✓
- Compose: Name/Phone/Address (required, prefilled), text/audio toggle, 5-min audio with countdown → Task 7 + `QaPrefs` + `AudioRecorder`. ✓
- WhatsApp-style conversation with timestamps/date separators, audio bubbles, read marking → Task 8 + `vm.loadMessages`. ✓
- Local cache of our own questions so full convo shows → Tasks 1, 3 (`SentQuestionDao`, `toChatItem` merge). ✓
- Urdu pre-render for typed questions → `vm.sendTyped` uses `UrduPipeline`. ✓
- FLAG_SECURE on QA screens → Task 9. ✓
- Identity bundled in encrypted payload (not server) → uses 2B `QaRepository`; address only in `QaPrefs` locally. ✓
- Shaykh-key-changed safety → `sendTyped`/`sendRecorded` catch `ShaykhKeyChangedException`. ✓

**Out of scope → Plan 2F:** biometric unlock before opening QA; content-free push (`user-<uuid>`) handling in `KhanqahFirebaseMessagingService` + deep-link into a thread; auto-lock on background.

**Placeholder scan:** Tasks 7 and 8 give the screen *contract* + structure with guidance rather than every Compose line, because they are the most layout-/judgment-heavy and should follow existing app styling — the implementer builds them completely and compilably. This is flagged as the place needing care/visual review, not a silent gap. Tasks 1–6 and 9 are fully concrete.

**Type consistency:** `QaViewModel` (`threads`/`messages`/`sendState`, `loadThreads`/`loadMessages`/`sendTyped`/`sendRecorded`/`playAnswerAudio`) is the single surface the three screens consume; `ChatItem`/`SendState` shapes are used consistently; nav `Screen.AskList/AskCompose/AskConversation` routes match the composable wiring.

**Build-order caveat (stated):** Tasks 5–8 are interdependent; build once at Task 9. Earlier per-task "build" steps for the screens are intentionally deferred to the Task 9 integration build (noted inline) — do not expect each screen to build in isolation before nav exists.
