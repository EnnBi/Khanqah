package com.ennbi.khanqah.ui.utils

// Mirrors the server default; only used when the API sends no speaker (e.g. older server).
const val DEFAULT_SPEAKER_EN = "Mufti Abdur Rashid Miftahi Sb"
const val DEFAULT_SPEAKER_UR = "مفتی عبدالرشید مفتاحی صاحب"

/** Speaker name in the listener's language, falling back to the default speaker. */
fun speakerLabel(en: String?, ur: String?, isUrdu: Boolean): String =
    if (isUrdu) ur?.trim().takeUnless { it.isNullOrEmpty() } ?: DEFAULT_SPEAKER_UR
    else en?.trim().takeUnless { it.isNullOrEmpty() } ?: DEFAULT_SPEAKER_EN
