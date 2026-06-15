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

    suspend fun isUrduAvailable(): Boolean {
        val engine = newEngine() ?: return false
        return try {
            val r = engine.setLanguage(urdu)
            r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED
        } finally {
            engine.shutdown()
        }
    }

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
