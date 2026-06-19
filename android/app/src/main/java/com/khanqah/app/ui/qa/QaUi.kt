package com.khanqah.app.ui.qa

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color

/** A reassurance shown in the empty-state carousel of the thread list. */
data class SafetyMessage(val icon: String, val titleEn: String, val titleUr: String, val bodyEn: String, val bodyUr: String)

val SafetyMessages = listOf(
    SafetyMessage(
        "🔒",
        "End-to-end encrypted", "خفیہ اور محفوظ",
        "Only Hazrat can read your questions. They are encrypted on your device before they ever leave it.",
        "آپ کے سوالات صرف حضرت پڑھ سکتے ہیں۔ یہ آپ کے فون پر ہی خفیہ کر دیے جاتے ہیں۔",
    ),
    SafetyMessage(
        "🌙",
        "Ask in any language", "کسی بھی زبان میں پوچھیں",
        "Type in your own language — it is translated to Urdu and sent privately to Hazrat.",
        "اپنی زبان میں لکھیں — یہ اردو میں ترجمہ ہو کر حضرت تک پہنچ جائے گا۔",
    ),
    SafetyMessage(
        "🔔",
        "Private notifications", "نجی اطلاعات",
        "We never put your question in a notification. The server only knows that a message arrived.",
        "آپ کا سوال کبھی اطلاع میں نہیں دکھایا جاتا۔ سرور کو صرف یہ معلوم ہوتا ہے کہ پیغام آیا ہے۔",
    ),
    SafetyMessage(
        "🗝️",
        "Your key stays with you", "چابی آپ کے پاس",
        "Your private key never leaves this phone. Not even we can read your conversation.",
        "آپ کی خفیہ چابی کبھی اس فون سے باہر نہیں جاتی۔ ہم بھی آپ کی گفتگو نہیں پڑھ سکتے۔",
    ),
)

/** Status-chip foreground/background pairs, tuned for light & dark (not in the base color scheme). */
data class ChipColors(val bg: Color, val fg: Color)

@Composable
@ReadOnlyComposable
fun answeredChipColors(): ChipColors = if (isSystemInDarkTheme())
    ChipColors(Color(0xFF143D30), Color(0xFF7EC79B))
else
    ChipColors(Color(0xFFE3F0E8), Color(0xFF2F7D4F))

@Composable
@ReadOnlyComposable
fun pendingChipColors(): ChipColors = if (isSystemInDarkTheme())
    ChipColors(Color(0xFF3A3115), Color(0xFFE0C36A))
else
    ChipColors(Color(0xFFF5E9C8), Color(0xFF9A7B2E))

/** Voice-note length as m:ss (e.g. 14 -> "0:14", 75 -> "1:15"). */
fun formatDuration(seconds: Int): String = "%d:%02d".format(seconds / 60, seconds % 60)

/** Compact relative time for the thread list ("2h ago", "Yesterday", "14 Jun"). */
fun relativeThreadTime(iso: String): String = try {
    val instant = java.time.Instant.parse(iso)
    val now = java.time.Instant.now()
    val mins = java.time.Duration.between(instant, now).toMinutes()
    when {
        mins < 1 -> "Just now"
        mins < 60 -> "${mins}m ago"
        mins < 24 * 60 -> "${mins / 60}h ago"
        mins < 48 * 60 -> "Yesterday"
        else -> {
            val zdt = instant.atZone(java.time.ZoneId.systemDefault())
            zdt.format(java.time.format.DateTimeFormatter.ofPattern("d MMM"))
        }
    }
} catch (_: Exception) {
    iso
}
