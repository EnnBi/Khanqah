package com.khanqah.admin.ui.live

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import okhttp3.*
import okio.ByteString.Companion.toByteString
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

private const val WS_URL = "wss://arrashid.ennbi.com/ws/"
private const val SAMPLE_RATE = 16000

class AudioStreamer {
    private val streaming = AtomicBoolean(false)
    private var audioRecord: AudioRecord? = null
    private var webSocket: WebSocket? = null

    private val bufferSize = AudioRecord.getMinBufferSize(
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
    ).coerceAtLeast(4096)

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun start(onReady: () -> Unit, onError: (String) -> Unit) {
        val request = Request.Builder().url(WS_URL).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                ws.send("""{"format":"pcm","sampleRate":$SAMPLE_RATE}""")
                val ar = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize,
                )
                if (ar.state != AudioRecord.STATE_INITIALIZED) {
                    onError("Microphone unavailable")
                    ws.close(1000, null)
                    return
                }
                audioRecord = ar
                streaming.set(true)
                ar.startRecording()
                onReady()
                Thread {
                    val buf = ByteArray(bufferSize)
                    while (streaming.get()) {
                        val n = ar.read(buf, 0, bufferSize)
                        if (n > 0) ws.send(buf.copyOf(n).toByteString())
                    }
                }.start()
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                onError(t.message ?: "Stream connection failed")
                cleanupAudio()
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                cleanupAudio()
            }
        })
    }

    fun stop() {
        streaming.set(false)
        webSocket?.close(1000, null)
        webSocket = null
        cleanupAudio()
    }

    private fun cleanupAudio() {
        streaming.set(false)
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
}
