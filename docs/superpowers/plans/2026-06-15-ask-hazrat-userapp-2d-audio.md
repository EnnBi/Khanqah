# Ask Hazrat — User App 2D: Audio Capture & Playback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two small, self-contained audio units the QA screens (2E) use: `AudioRecorder` records a voice question (AAC/m4a, hard 5-minute cap) and returns the bytes; `AudioPlayer` plays a decrypted audio clip (the Shaykh's answer audio, or the user's own cached question audio) from an in-memory byte array.

**Architecture:** Both are thin wrappers over the Android platform (`MediaRecorder`, `MediaPlayer`) living in `com.khanqah.app.qa`, decoupled from the app's existing media3 content player so QA audio never interferes with content playback. Recording writes to a temp file in `cacheDir`; the bytes are read out for encryption (2B's `sendAudioQuestion`). Playback writes the already-decrypted bytes to a short-lived temp file (transient plaintext, per spec §9), plays it, and deletes it on stop/completion.

**Tech Stack:** Kotlin, `android.media.MediaRecorder` (AAC, `setMaxDuration`), `android.media.MediaPlayer`, `RECORD_AUDIO` permission. minSdk 26.

This is **sub-plan 2D** (after 2A/2B/2C). Consumed by 2E. Recorded voice is the user's own audio sent as-is (no translation/TTS — that pipeline, 2C, is for typed text only).

---

## Notes / scope

- **No automated test in this plan.** Recording and playback are hardware- and permission-bound (real mic, audio output, runtime `RECORD_AUDIO` grant) — not meaningfully testable headlessly or on CI. Verification is **build-compile** here + **manual on-device** in 2E (record a clip, send, play an answer). This is an explicit, stated limitation, not an omission.
- The runtime `RECORD_AUDIO` permission *request* and the recording UI/countdown live in **2E**; 2D only declares the permission and provides the engine + a max-duration callback.
- Decrypted audio touches disk only as a short-lived temp file in `cacheDir`, deleted on stop/completion (spec §9 allows transient plaintext during use).

## File Structure

| File | Responsibility |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | Declare `RECORD_AUDIO` (modify) |
| `android/…/qa/AudioRecorder.kt` | MediaRecorder wrapper, 5-min cap, returns bytes |
| `android/…/qa/AudioPlayer.kt` | MediaPlayer wrapper, plays bytes, position/stop |

Gradle from `android/`.

---

### Task 1: Declare RECORD_AUDIO permission

**Files:** Modify `android/app/src/main/AndroidManifest.xml`.

- [ ] **Step 1: Add the permission**

Read `AndroidManifest.xml` first. Alongside the existing `<uses-permission>` entries (the app already declares INTERNET, POST_NOTIFICATIONS, FOREGROUND_SERVICE, etc.), add:

```xml
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
```

If it's already declared, make no change and note that.

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add android/app/src/main/AndroidManifest.xml && git commit -m "feat(android): declare RECORD_AUDIO for qa voice questions"`

---

### Task 2: AudioRecorder

**Files:** Create `android/app/src/main/java/com/khanqah/app/qa/AudioRecorder.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.qa

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/**
 * Records a voice question to AAC/m4a with a hard 5-minute cap. Self-contained
 * (does not touch the app's content player). Caller must hold RECORD_AUDIO at
 * runtime (requested in the UI layer). [onMaxReached] fires when the cap is hit
 * (the recording is stopped by the platform; the caller should then call [stop]).
 */
class AudioRecorder(private val context: Context) {

    companion object { const val MAX_DURATION_MS = 5 * 60 * 1000 }

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    /** Starts recording; returns the temp output file being written. */
    fun start(onMaxReached: () -> Unit): File {
        val file = File.createTempFile("qa_rec_", ".m4a", context.cacheDir)
        val rec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            MediaRecorder(context)
        else
            @Suppress("DEPRECATION") MediaRecorder()
        rec.setAudioSource(MediaRecorder.AudioSource.MIC)
        rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        rec.setAudioEncodingBitRate(64_000)
        rec.setAudioSamplingRate(44_100)
        rec.setMaxDuration(MAX_DURATION_MS)
        rec.setOutputFile(file.absolutePath)
        rec.setOnInfoListener { _, what, _ ->
            if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) onMaxReached()
        }
        rec.prepare()
        rec.start()
        recorder = rec
        outputFile = file
        return file
    }

    /** Stops recording and returns the recorded bytes (or null on failure). Deletes the temp file. */
    fun stop(): ByteArray? {
        val file = outputFile
        return try {
            recorder?.apply { stop(); release() }
            file?.readBytes()
        } catch (_: Exception) {
            null
        } finally {
            recorder = null
            outputFile = null
            file?.delete()
        }
    }

    /** Aborts recording and discards the file. */
    fun cancel() {
        try { recorder?.apply { stop(); release() } } catch (_: Exception) {}
        recorder = null
        outputFile?.delete()
        outputFile = null
    }
}
```

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/AudioRecorder.kt && git commit -m "feat(android): voice-question recorder (AAC, 5-min cap)"`

---

### Task 3: AudioPlayer

**Files:** Create `android/app/src/main/java/com/khanqah/app/qa/AudioPlayer.kt`.

- [ ] **Step 1: Implement**

```kotlin
package com.khanqah.app.qa

import android.content.Context
import android.media.MediaPlayer
import java.io.File

/**
 * Plays a decrypted audio clip from an in-memory byte array (the Shaykh's answer
 * audio, or the user's own cached question audio). Writes a short-lived temp file
 * (deleted on stop/completion) since MediaPlayer needs a source. Format-agnostic
 * (m4a recordings and WAV TTS both work — MediaPlayer sniffs the container).
 */
class AudioPlayer(private val context: Context) {

    private var player: MediaPlayer? = null
    private var temp: File? = null

    /** Plays [bytes]; [onComplete] fires when playback finishes. Replaces any current playback. */
    fun play(bytes: ByteArray, onComplete: () -> Unit = {}) {
        stop()
        val f = File.createTempFile("qa_play_", ".tmp", context.cacheDir)
        f.writeBytes(bytes)
        val mp = MediaPlayer()
        mp.setDataSource(f.absolutePath)
        mp.setOnCompletionListener {
            onComplete()
            stop()
        }
        mp.prepare()
        mp.start()
        player = mp
        temp = f
    }

    val isPlaying: Boolean get() = try { player?.isPlaying == true } catch (_: Exception) { false }
    val durationMs: Int get() = try { player?.duration ?: 0 } catch (_: Exception) { 0 }
    val positionMs: Int get() = try { player?.currentPosition ?: 0 } catch (_: Exception) { 0 }

    fun pause() { try { player?.pause() } catch (_: Exception) {} }
    fun resume() { try { player?.start() } catch (_: Exception) {} }

    /** Stops playback and deletes the temp file. */
    fun stop() {
        try { player?.apply { if (isPlaying) stop(); release() } } catch (_: Exception) {}
        player = null
        temp?.delete()
        temp = null
    }
}
```

- [ ] **Step 2: Build** — `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`.
- [ ] **Step 3: Commit** — `git add …/AudioPlayer.kt && git commit -m "feat(android): qa audio player (plays decrypted bytes)"`

---

## Self-Review

**Spec coverage:**
- §6a audio question recording with a **5-minute maximum** → `AudioRecorder.MAX_DURATION_MS` + `setMaxDuration` + `onMaxReached` (Task 2). ✓
- §8/§6a answer audio playback + own-question audio playback → `AudioPlayer.play(bytes)` (Task 3); bytes come from 2B `fetchAudio` (answers) or the local cache (own questions, 2E). ✓
- §9 no plaintext at rest beyond transient use → playback temp file deleted on stop/completion; recording temp deleted after bytes are read (Tasks 2–3). ✓
- Recorded voice sent as-is (not run through 2C translate/TTS) → documented in scope. ✓

**Out of scope (2E):** runtime `RECORD_AUDIO` permission request, the record button + live countdown UI, wiring `AudioRecorder` bytes into `QaRepository.sendAudioQuestion`, and wiring `AudioPlayer` into answer bubbles.

**Placeholder scan:** none. The "no automated test" decision is stated and justified (hardware/permission-bound); manual on-device verification happens in 2E.

**Type consistency:** `AudioRecorder.start(onMaxReached) → File`, `stop(): ByteArray?`, `cancel()`; `AudioPlayer.play(bytes, onComplete)`, `stop()`, `isPlaying`/`positionMs`/`durationMs`. 2E consumes `stop()`'s `ByteArray?` → `QaRepository.sendAudioQuestion(audioBytes = …)`, and feeds `fetchAudio(...)`/cached bytes → `AudioPlayer.play(...)`.
