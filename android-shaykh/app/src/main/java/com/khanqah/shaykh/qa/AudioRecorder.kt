package com.khanqah.shaykh.qa

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/**
 * Records a voice question to AAC/m4a with a hard 5-minute cap. Self-contained.
 * Caller must hold RECORD_AUDIO at runtime. [onMaxReached] fires when the cap is hit.
 */
class AudioRecorder(private val context: Context) {

    companion object { const val MAX_DURATION_MS = 5 * 60 * 1000 }

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

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

    fun cancel() {
        try { recorder?.apply { stop(); release() } } catch (_: Exception) {}
        recorder = null
        outputFile?.delete()
        outputFile = null
    }
}
