package com.khanqah.shaykh.qa

import android.content.Context
import android.media.MediaPlayer
import java.io.File

/**
 * Plays a decrypted audio clip from an in-memory byte array. Writes a short-lived
 * temp file (deleted on stop/completion). Format-agnostic (m4a + WAV).
 */
class AudioPlayer(private val context: Context) {

    private var player: MediaPlayer? = null
    private var temp: File? = null

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

    fun stop() {
        try { player?.apply { if (isPlaying) stop(); release() } } catch (_: Exception) {}
        player = null
        temp?.delete()
        temp = null
    }
}
