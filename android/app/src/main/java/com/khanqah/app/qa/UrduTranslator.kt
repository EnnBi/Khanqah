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
            val code = client.identifyLanguage(text).await()
            TranslateLanguage.fromLanguageTag(code) ?: TranslateLanguage.ENGLISH
        } catch (_: Exception) {
            TranslateLanguage.ENGLISH
        } finally {
            client.close()
        }
    }
}
