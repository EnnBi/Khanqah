package com.khanqah.app.qa

import android.content.Context

data class PreparedQuestion(
    val urduText: String,
    val audioBytes: ByteArray?,
)

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

    suspend fun canSpeakUrdu(): Boolean = runCatching { tts.isUrduAvailable() }.getOrDefault(false)
}
