package com.khanqah.app.qa

import android.content.Context
import android.media.MediaPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File

/** Observable playback state for the currently-loaded clip. [key] identifies which
 *  message/clip is loaded so the UI can show play/pause + progress on the right bubble only. */
data class Playback(
    val key: String? = null,
    val isPlaying: Boolean = false,
    val positionMs: Int = 0,
    val durationMs: Int = 0,
)

/**
 * Plays a decrypted audio clip from an in-memory byte array. Writes a short-lived
 * temp file (deleted on stop/completion). Format-agnostic (m4a + WAV). Exposes a
 * [playback] StateFlow that ticks position while playing so the UI can render a
 * WhatsApp-style play/pause toggle and seek bar.
 */
class AudioPlayer(private val context: Context) {

    private var player: MediaPlayer? = null
    private var temp: File? = null
    private var ticker: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val _playback = MutableStateFlow(Playback())
    val playback: StateFlow<Playback> = _playback

    /** Load [bytes] for [key] and start playing from the beginning. */
    fun start(key: String, bytes: ByteArray) {
        release()
        val f = File.createTempFile("qa_play_", ".tmp", context.cacheDir)
        f.writeBytes(bytes)
        val mp = MediaPlayer()
        mp.setDataSource(f.absolutePath)
        mp.setOnCompletionListener {
            stopTicker()
            _playback.value = _playback.value.copy(isPlaying = false, positionMs = 0)
        }
        mp.prepare()
        mp.start()
        player = mp
        temp = f
        _playback.value = Playback(key = key, isPlaying = true, positionMs = 0, durationMs = mp.duration)
        startTicker()
    }

    /** Pause if playing, resume if paused. No-op if nothing is loaded. */
    fun toggle() {
        val mp = player ?: return
        try {
            if (mp.isPlaying) {
                mp.pause()
                stopTicker()
                _playback.value = _playback.value.copy(isPlaying = false, positionMs = mp.currentPosition)
            } else {
                mp.start()
                _playback.value = _playback.value.copy(isPlaying = true)
                startTicker()
            }
        } catch (_: Exception) {}
    }

    fun seekTo(ms: Int) {
        try {
            player?.seekTo(ms)
            _playback.value = _playback.value.copy(positionMs = ms)
        } catch (_: Exception) {}
    }

    val isPlaying: Boolean get() = try { player?.isPlaying == true } catch (_: Exception) { false }

    private fun startTicker() {
        ticker?.cancel()
        ticker = scope.launch {
            while (isActive) {
                val mp = player ?: break
                try {
                    _playback.value = _playback.value.copy(
                        positionMs = mp.currentPosition,
                        isPlaying = mp.isPlaying,
                    )
                } catch (_: Exception) {}
                delay(200)
            }
        }
    }

    private fun stopTicker() { ticker?.cancel(); ticker = null }

    private fun release() {
        stopTicker()
        try { player?.apply { if (isPlaying) stop(); release() } } catch (_: Exception) {}
        player = null
        temp?.delete()
        temp = null
    }

    fun stop() {
        release()
        _playback.value = Playback()
    }
}
