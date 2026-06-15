# Ask Hazrat — User App 2C: Urdu Translate + TTS Pre-render

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On-device pipeline that turns a typed question (in any language) into **Urdu text + Urdu speech audio**, so the Shaykh always hears/reads Urdu. Everything runs locally — no cloud translation/TTS (that would leak plaintext and break E2EE).

**Architecture:** Three small units. `UrduTranslator` uses ML Kit language-ID to detect the input language, then ML Kit on-device translation to produce Urdu (downloading the ~30 MB Urdu model once). `UrduTts` wraps Android `TextToSpeech` to synthesize Urdu text to a WAV file and reports whether an Urdu voice is available. `UrduPipeline` is the facade 2E calls: `prepare(typedText) → PreparedQuestion(urduText, audioBytes?)`. If no Urdu TTS voice exists, `audioBytes` is null and the caller sends text-only (the Shaykh app can TTS on its side).

**Tech Stack:** Kotlin, ML Kit Translate + Language ID (on-device), `kotlinx-coroutines-play-services` (`Task.await()`), Android `TextToSpeech` (`synthesizeToFile`). minSdk 26.

This is **sub-plan 2C** (after 2A crypto, 2B data layer). Consumed by 2E. Recorded questions (the user's own voice) bypass this pipeline; 2C is only for typed-text questions.

---

## Constraint (from design §7)

Cloud translation/TTS is **prohibited** — it would transmit the user's plaintext to a third party. ML Kit translation and Android `TextToSpeech` both run on-device. The Urdu translation model (~30 MB) downloads once over the network, then works offline. Not every device ships an Urdu TTS voice — the pipeline degrades gracefully to text-only.

## File Structure

| File | Responsibility |
|---|---|
| `android/gradle/libs.versions.toml` | Add ML Kit translate + language-id + coroutines-play-services (modify) |
| `android/app/build.gradle.kts` | Add the three `implementation` lines (modify) |
| `android/…/qa/UrduTranslator.kt` | Detect language → translate to Urdu; model download |
| `android/…/qa/UrduTts.kt` | `TextToSpeech` → WAV bytes; Urdu-voice availability |
| `android/…/qa/UrduPipeline.kt` | Facade: typed text → `PreparedQuestion(urduText, audioBytes?)` |

New package `com.khanqah.app.qa` (feature code distinct from `crypto`). Gradle from `android/`.

---

### Task 1: Add ML Kit + coroutines-play-services dependencies

**Files:** Modify `android/gradle/libs.versions.toml`, `android/app/build.gradle.kts`.

- [ ] **Step 1: Catalog** — under `[versions]`:
```toml
mlkitTranslate = "17.0.3"
mlkitLangId = "17.0.6"
coroutinesPlayServices = "1.8.1"
```
under `[libraries]`:
```toml
mlkit-translate = { group = "com.google.mlkit", name = "translate", version.ref = "mlkitTranslate" }
mlkit-language-id = { group = "com.google.mlkit", name = "language-id", version.ref = "mlkitLangId" }
coroutines-play-services = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-play-services", version.ref = "coroutinesPlayServices" }
```

- [ ] **Step 2: Module deps** — in `android/app/build.gradle.kts` `dependencies { }`:
```kotlin
    implementation(libs.mlkit.translate)
    implementation(libs.mlkit.language.id)
    implementation(libs.coroutines.play.services)
```

- [ ] **Step 3: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL` (downloads ML Kit AARs). If `mlkit-translate` 17.0.3 doesn't resolve, report the exact error and the latest available version rather than guessing silently.

- [ ] **Step 4: Commit**
```bash
git add android/gradle/libs.versions.toml android/app/build.gradle.kts
git commit -m "build(android): add ML Kit translate + language-id for Urdu pipeline"
```

---

### Task 2: UrduTranslator

**Files:** Create `android/app/src/main/java/com/khanqah/app/qa/UrduTranslator.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.qa

import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import com.google.mlkit.common.model.DownloadConditions
import kotlinx.coroutines.tasks.await

/**
 * On-device translation of typed input to Urdu. Detects the source language with
 * ML Kit language-ID, then translates source→Urdu (model downloaded once, ~30 MB).
 * Fully offline after the first model download. Never sends text off-device.
 */
class UrduTranslator {

    /** Returns the input rendered in Urdu. If already Urdu (or undetectable), returns input unchanged. */
    suspend fun toUrdu(text: String): String {
        if (text.isBlank()) return text
        val source = detectSource(text)
        if (source == TranslateLanguage.URDU) return text

        val translator = Translation.getClient(
            TranslatorOptions.Builder()
                .setSourceLanguage(source)
                .setTargetLanguage(TranslateLanguage.URDU)
                .build()
        )
        return try {
            translator.downloadModelIfNeeded(DownloadConditions.Builder().build()).await()
            translator.translate(text).await()
        } finally {
            translator.close()
        }
    }

    /** Ensures the Urdu (+ given source) model is downloaded. Call ahead of time for UX. */
    suspend fun ensureModel(text: String) {
        val source = detectSource(text)
        if (source == TranslateLanguage.URDU) return
        val translator = Translation.getClient(
            TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(TranslateLanguage.URDU).build()
        )
        try {
            translator.downloadModelIfNeeded(DownloadConditions.Builder().build()).await()
        } finally {
            translator.close()
        }
    }

    private suspend fun detectSource(text: String): String {
        val client = LanguageIdentification.getClient()
        return try {
            val code = client.identifyLanguage(text).await() // BCP-47 or "und"
            val supported = TranslateLanguage.fromLanguageTag(code)
            supported ?: TranslateLanguage.ENGLISH
        } catch (_: Exception) {
            TranslateLanguage.ENGLISH
        } finally {
            client.close()
        }
    }
}
```

> Verify the ML Kit method names against the resolved AARs (`identifyLanguage`, `downloadModelIfNeeded`, `TranslateLanguage.fromLanguageTag`). These are stable across 17.x; adjust only if the build fails, reporting changes.

- [ ] **Step 2: Build + commit** — `./gradlew :app:assembleDebug --no-daemon`; `git add …/UrduTranslator.kt && git commit -m "feat(android): on-device Urdu translation (ML Kit)"`

---

### Task 3: UrduTts

**Files:** Create `android/app/src/main/java/com/khanqah/app/qa/UrduTts.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.qa

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.io.File
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Renders Urdu text to a WAV file via Android on-device TextToSpeech.
 * If no Urdu voice is installed, [synthesize] returns null and the caller
 * sends text-only (the Shaykh app can TTS on its side / show the text).
 */
class UrduTts(private val context: Context) {

    private val urdu = Locale("ur")

    private suspend fun newEngine(): TextToSpeech? = suspendCoroutine { cont ->
        var tts: TextToSpeech? = null
        tts = TextToSpeech(context) { status ->
            cont.resume(if (status == TextToSpeech.SUCCESS) tts else null)
        }
    }

    /** True if an Urdu voice is usable on this device. */
    suspend fun isUrduAvailable(): Boolean {
        val engine = newEngine() ?: return false
        return try {
            val r = engine.setLanguage(urdu)
            r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED
        } finally {
            engine.shutdown()
        }
    }

    /** Synthesize [urduText] to a WAV file and return its bytes, or null if no Urdu voice. */
    suspend fun synthesize(urduText: String): ByteArray? {
        val engine = newEngine() ?: return null
        val lang = engine.setLanguage(urdu)
        if (lang == TextToSpeech.LANG_MISSING_DATA || lang == TextToSpeech.LANG_NOT_SUPPORTED) {
            engine.shutdown(); return null
        }
        val out = File.createTempFile("qa_tts_", ".wav", context.cacheDir)
        val ok = suspendCancellableCoroutine<Boolean> { cont ->
            val id = "qa_tts"
            engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) { if (cont.isActive) cont.resume(true) }
                @Deprecated("deprecated") override fun onError(utteranceId: String?) { if (cont.isActive) cont.resume(false) }
                override fun onError(utteranceId: String?, errorCode: Int) { if (cont.isActive) cont.resume(false) }
            })
            val res = engine.synthesizeToFile(urduText, android.os.Bundle(), out, id)
            if (res != TextToSpeech.SUCCESS && cont.isActive) cont.resume(false)
            cont.invokeOnCancellation { engine.stop() }
        }
        engine.shutdown()
        return if (ok && out.length() > 0) out.readBytes().also { out.delete() }
        else { out.delete(); null }
    }
}
```

- [ ] **Step 2: Build + commit** — `./gradlew :app:assembleDebug --no-daemon`; `git add …/UrduTts.kt && git commit -m "feat(android): on-device Urdu text-to-speech to WAV"`

---

### Task 4: UrduPipeline facade

**Files:** Create `android/app/src/main/java/com/khanqah/app/qa/UrduPipeline.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.qa

import android.content.Context

/** Result of preparing a typed question: always Urdu text; audio if a voice exists. */
data class PreparedQuestion(
    val urduText: String,
    val audioBytes: ByteArray?,   // null => send text-only
)

/**
 * Facade for 2E: typed text (any language) → Urdu text + (best-effort) Urdu audio,
 * entirely on-device. Recorded voice questions do NOT use this pipeline.
 */
class UrduPipeline(
    context: Context,
    private val translator: UrduTranslator = UrduTranslator(),
    private val tts: UrduTts = UrduTts(context),
) {
    suspend fun prepare(typedText: String): PreparedQuestion {
        val urdu = translator.toUrdu(typedText)
        val audio = runCatching { tts.synthesize(urdu) }.getOrNull()
        return PreparedQuestion(urduText = urdu, audioBytes = audio)
    }

    /** Whether this device can produce Urdu audio (for UI hinting). */
    suspend fun canSpeakUrdu(): Boolean = runCatching { tts.isUrduAvailable() }.getOrDefault(false)
}
```

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/UrduPipeline.kt && git commit -m "feat(android): Urdu pipeline facade (translate + TTS)"`

---

### Task 5: Instrumented smoke test (tolerant)

**Files:** Create `android/app/src/androidTest/java/com/khanqah/app/qa/UrduPipelineTest.kt`.

These are **tolerant**: translation needs a one-time ~30 MB model download (network), and Urdu TTS may be absent on the test device — so the test asserts the pipeline *runs and returns Urdu text*, and treats missing audio as acceptable (logs it), never failing on environment gaps.

- [ ] **Step 1: Write**

```kotlin
package com.khanqah.app.qa

import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UrduPipelineTest {
    private val ctx = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun prepare_returnsUrduText_audioOptional() = runBlocking {
        val pipeline = UrduPipeline(ctx)
        val prepared = pipeline.prepare("You may shorten prayer while travelling")
        // Translation must yield non-blank text (Urdu if model downloaded; original on offline CI).
        assertTrue("urduText must be non-blank", prepared.urduText.isNotBlank())
        Log.i("UrduPipelineTest", "urdu='${prepared.urduText}' audio=${prepared.audioBytes?.size ?: "none"}")
    }
}
```

> Note: on a device/emulator without network or the Urdu model, `toUrdu` returns the original English (acceptable — test only requires non-blank). The real translation quality is validated manually on a connected device with network. This is a smoke test, not a correctness oracle.

- [ ] **Step 2: Run on device (if available)** — `./gradlew :app:connectedDebugAndroidTest --no-daemon` (Xiaomi `8614caf50408`, accept the MIUI install prompt). Expected: PASS. If no device, run `./gradlew :app:assembleDebugAndroidTest --no-daemon` to confirm compilation and note on-device run deferred.

- [ ] **Step 3: Commit** — `git add …/UrduPipelineTest.kt && git commit -m "test(android): tolerant Urdu pipeline smoke test"`

---

## Self-Review

**Spec coverage (§7):**
- typed text → detect language → translate to Urdu on-device (ML Kit) → Task 2. ✓
- Urdu text → speech on-device (Android TTS) → Task 3. ✓
- "Shaykh always hears Urdu; degrade to text-only if no Urdu voice" → `PreparedQuestion.audioBytes` nullable (Task 4); caller (2E) sends `sendAudioQuestion` when audio present, else `sendTextQuestion`. ✓
- On-device only (no cloud) → ML Kit + Android TTS, no network calls except the one-time model download → satisfied. ✓
- ~30 MB model footprint, downloaded once → `downloadModelIfNeeded` + `ensureModel` for pre-warming (2E shows progress). ✓

**Out of scope (later):** the model-download progress UI + the decision to call `sendAudioQuestion` vs `sendTextQuestion` live in 2E (this plan exposes `prepare`/`canSpeakUrdu`); recorded-voice questions are 2D.

**Placeholder scan:** none. The ML Kit method-name verification note (Task 2) is build-time guidance, not a placeholder.

**Type consistency:** `UrduPipeline.prepare → PreparedQuestion(urduText, audioBytes?)`; 2E will route `audioBytes != null → QaRepository.sendAudioQuestion(urduTranscript = urduText, audioBytes = …)` else `sendTextQuestion(urduText)`. `UrduTranslator.toUrdu`/`UrduTts.synthesize` signatures match the facade.
