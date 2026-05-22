package com.khanqah.app.ui.utils

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf

val LocalIsUrdu = compositionLocalOf { false }

/** Pick the right string based on the current language. */
@Composable
fun s(en: String, ur: String): String = if (LocalIsUrdu.current) ur else en

// ── Tabs ──────────────────────────────────────────────────────────────────────
object Tabs {
    const val HOME_EN      = "Home";        const val HOME_UR      = "ہوم"
    const val LIBRARY_EN   = "Library";     const val LIBRARY_UR   = "لائبریری"
    const val BAYAANAT_EN  = "Bayaanat";    const val BAYAANAT_UR  = "بیانات"
    const val CLIPS_EN     = "Clips";       const val CLIPS_UR     = "کلپس"
    const val PROFILE_EN   = "Profile";     const val PROFILE_UR   = "پروفائل"
}

// ── Home ──────────────────────────────────────────────────────────────────────
object HomeStr {
    const val TITLE_EN    = "Khanqah Maseeh-ul-Ummah"; const val TITLE_UR    = "خانقاہ مسیح الامت"
    const val SUBTITLE_EN = "Hazrat Mufti Abdur Rasheed Miftahi Sahab"
    const val SUBTITLE_UR = "حضرت مفتی عبدالرشید مفتاحی دامت برکاتہم"
    const val LIVE_NOW_EN = "Live Now";   const val LIVE_NOW_UR = "ابھی لائیو"
    const val NEXT_LIVE_EN = "Next Live"; const val NEXT_LIVE_UR = "اگلا لائیو"
    const val RECENTS_EN  = "Recents";   const val RECENTS_UR  = "تازہ ترین"
    const val SEE_ALL_EN  = "See All";   const val SEE_ALL_UR  = "سب دیکھیں"
    const val JOIN_EN     = "Join";      const val JOIN_UR     = "شامل ہوں"
    const val NO_CONTENT_EN = "No content yet."
    const val NO_CONTENT_UR = "ابھی تک کوئی مواد نہیں۔"
    // Quick actions
    const val MAMULAT_EN        = "Mamulat";           const val MAMULAT_UR        = "معمولات"
    const val MAJALIS_EN        = "Majalis";           const val MAJALIS_UR        = "مجالس"
    const val SALAH_EN          = "Salah Timings";     const val SALAH_UR          = "اوقاتِ نماز"
    const val MAJLIS_TIMES_EN   = "Majlis Timings";    const val MAJLIS_TIMES_UR   = "اوقاتِ مجلس"
    const val CATEGORIES_EN     = "Explore";           const val CATEGORIES_UR     = "تمام زمرے"
    const val ASK_HAZRAT_EN     = "Ask Hazrat";        const val ASK_HAZRAT_UR     = "حضرت سے سوال"
}

// ── Library ───────────────────────────────────────────────────────────────────
object LibraryStr {
    const val TITLE_EN       = "Library";                         const val TITLE_UR       = "لائبریری"
    const val SEARCH_EN      = "Search bayans, clips, books…";   const val SEARCH_UR      = "بیانات، کلپس، کتابیں تلاش کریں…"
    const val CATEGORIES_EN  = "CATEGORIES";                      const val CATEGORIES_UR  = "زمرے"
    const val RESULTS_EN     = "RESULTS";                         const val RESULTS_UR     = "نتائج"
    const val NO_CONTENT_EN  = "No content available";            const val NO_CONTENT_UR  = "کوئی مواد دستیاب نہیں"
}

// ── Player ────────────────────────────────────────────────────────────────────
object PlayerStr {
    const val TOPICS_EN      = "Topics";         const val TOPICS_UR      = "موضوعات"
    const val LOADING_EN     = "Loading…";       const val LOADING_UR     = "لوڈ ہو رہا ہے…"
    const val DOWNLOADING_EN = "Downloading…";   const val DOWNLOADING_UR = "ڈاؤن لوڈ ہو رہا ہے…"
    const val PREPARING_EN   = "Preparing…";     const val PREPARING_UR   = "تیار ہو رہا ہے…"
}

// ── Profile ───────────────────────────────────────────────────────────────────
object ProfileStr {
    const val TITLE_EN       = "Profile";               const val TITLE_UR       = "پروفائل"
    const val SETTINGS_EN    = "& settings";             const val SETTINGS_UR    = "اور ترتیبات"
    const val GUEST_EN       = "Guest";                  const val GUEST_UR       = "مہمان"
    const val NOT_SIGNED_EN  = "Not signed in";          const val NOT_SIGNED_UR  = "سائن اِن نہیں"
    const val SIGN_IN_EN     = "SIGN IN";                const val SIGN_IN_UR     = "سائن اِن"
    const val SIGN_OUT_EN    = "SIGN OUT";               const val SIGN_OUT_UR    = "سائن آوٹ"
    const val LANGUAGE_EN    = "Language";               const val LANGUAGE_UR    = "زبان"
    const val APPEARANCE_EN  = "Appearance";             const val APPEARANCE_UR  = "تھیم"
    const val SPEED_EN       = "Playback Speed";         const val SPEED_UR       = "پلے بیک کی رفتار"
    const val NOTIF_EN       = "Notifications";          const val NOTIF_UR       = "اطلاعات"
    const val SKIP_EN        = "Skip Interval";          const val SKIP_UR        = "اسکپ وقفہ"
    const val ABOUT_EN       = "About the Khanqah";      const val ABOUT_UR       = "خانقاہ کے بارے میں"
    const val BIO_EN         = "Hazrat Mufti Abdur Rasheed Miftahi Sahab's Bio"
    const val BIO_UR         = "حضرت مفتی عبدالرشید مفتاحی صاحب کا تعارف"
    // Section headers
    const val PREF_TAG_EN    = "PREFERENCES";            const val PREF_TAG_UR    = "ترجیحات"
    const val PREF_SUB_EN    = "Personalise your experience"
    const val PREF_SUB_UR    = "اپنا تجربہ ذاتی نوعیت کا بنائیں"
    const val ABOUT_TAG_EN   = "ABOUT";                  const val ABOUT_TAG_UR   = "تعارف"
    const val ABOUT_SUB_EN   = "Learn more about us";   const val ABOUT_SUB_UR   = "ہمارے بارے میں مزید جانیں"
}

// ── Schedule ──────────────────────────────────────────────────────────────────
object ScheduleStr {
    const val TITLE_EN      = "Schedule";          const val TITLE_UR      = "شیڈول"
    const val NEXT_EN       = "Next Session";      const val NEXT_UR       = "اگلا سیشن"
    const val UPCOMING_EN   = "Upcoming Sessions"; const val UPCOMING_UR   = "آنے والے سیشن"
    const val NO_SCHED_EN   = "No sessions scheduled"
    const val NO_SCHED_UR   = "کوئی سیشن طے نہیں"
    const val RECURRING_EN  = "Recurring";         const val RECURRING_UR  = "بار بار"
}

// ── Type labels ───────────────────────────────────────────────────────────────
val TYPE_LABELS_EN = mapOf(
    "bayan"     to "Bayan",     "clip"   to "Clip",   "nazam"   to "Nazam",
    "quran"     to "Quran",     "book"   to "Book",   "mamulat" to "Mamulat",
    "hamd_naat" to "Hamd & Naat", "majalis" to "Majalis",
)
val TYPE_LABELS_UR = mapOf(
    "bayan"     to "بیان",      "clip"   to "کلپ",   "nazam"   to "نظم",
    "quran"     to "قرآن",      "book"   to "کتاب",  "mamulat" to "معمولات",
    "hamd_naat" to "حمد و نعت", "majalis" to "مجلس",
)

fun typeLabel(type: String, isUrdu: Boolean): String =
    if (isUrdu) TYPE_LABELS_UR[type.lowercase()] ?: type
    else TYPE_LABELS_EN[type.lowercase()] ?: type.replaceFirstChar { it.uppercase() }
