package com.khanqah.app.crypto

import com.google.gson.Gson

data class QuestionEnvelope(
    val name: String,
    val phone: String,
    val address: String,
    val kind: String,
    val text: String = "",
    val audioRef: String? = null,
    val audioKeyB64: String? = null,
    val audioNonceB64: String? = null,
)

data class AnswerEnvelope(
    val kind: String,
    val text: String = "",
    val audioRef: String? = null,
    val audioKeyB64: String? = null,
    val audioNonceB64: String? = null,
    val durationSec: Int = 0,
)

object QaProtocol {
    private val gson = Gson()
    fun encodeQuestion(e: QuestionEnvelope): ByteArray = gson.toJson(e).toByteArray(Charsets.UTF_8)
    fun decodeQuestion(bytes: ByteArray): QuestionEnvelope =
        gson.fromJson(String(bytes, Charsets.UTF_8), QuestionEnvelope::class.java)
    fun encodeAnswer(e: AnswerEnvelope): ByteArray = gson.toJson(e).toByteArray(Charsets.UTF_8)
    fun decodeAnswer(bytes: ByteArray): AnswerEnvelope =
        gson.fromJson(String(bytes, Charsets.UTF_8), AnswerEnvelope::class.java)
}
