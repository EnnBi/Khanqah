package com.ennbi.khanqah.ui.library

import com.ennbi.khanqah.data.db.entities.CategoryEntity
import com.ennbi.khanqah.data.db.entities.ContentEntity
import com.ennbi.khanqah.data.model.ContentFacets

/** Search text plus the two popup filters. `speakerKey == OTHER_SPEAKER_KEY` means "no speaker". */
data class ContentFilter(
    val query: String = "",
    val categoryId: String? = null,
    val speakerKey: String? = null,
) {
    val isActive get() = query.isNotBlank() || categoryId != null || speakerKey != null

    /** How many popup filters are on (the search text isn't counted); drives the dot on the icon. */
    val facetCount get() = listOfNotNull(categoryId, speakerKey).size
}

data class SpeakerOption(val key: String, val label: String)

const val OTHER_SPEAKER_KEY = ""
private const val OTHER_EN = "Other"
private const val OTHER_UR = "دیگر"

/** Stable identity of a speaker, independent of the app language. Blank means no speaker. */
fun ContentEntity.speakerKey(): String =
    (creditEn?.trim().takeUnless { it.isNullOrEmpty() } ?: creditUr?.trim()).orEmpty()

private fun ContentEntity.speakerLabel(isUrdu: Boolean): String {
    val en = creditEn?.trim().orEmpty()
    val ur = creditUr?.trim().orEmpty()
    return when {
        isUrdu && ur.isNotEmpty() -> ur
        en.isNotEmpty() -> en
        ur.isNotEmpty() -> ur
        else -> if (isUrdu) OTHER_UR else OTHER_EN
    }
}

fun List<ContentEntity>.applyFilter(f: ContentFilter): List<ContentEntity> = filter { c ->
    (f.query.isBlank() || listOf(c.titleEn, c.titleUr, c.creditEn.orEmpty(), c.creditUr.orEmpty())
        .any { it.contains(f.query.trim(), ignoreCase = true) }) &&
        (f.categoryId == null || c.categoryId == f.categoryId) &&
        (f.speakerKey == null || c.speakerKey().equals(f.speakerKey, ignoreCase = true))
}

/** Distinct speakers in [items], named in the listener's language; "Other" (no speaker) goes last. */
fun speakerOptions(items: List<ContentEntity>, isUrdu: Boolean): List<SpeakerOption> =
    items.groupBy { it.speakerKey().lowercase() }
        .map { (_, group) -> SpeakerOption(group.first().speakerKey(), group.first().speakerLabel(isUrdu)) }
        .sortedWith(
            compareBy<SpeakerOption> { it.key == OTHER_SPEAKER_KEY }.thenBy { it.label.lowercase() },
        )

/** Categories that actually have content in [items], in their normal order. */
fun categoryOptions(items: List<ContentEntity>, categories: List<CategoryEntity>): List<CategoryEntity> {
    val used = items.map { it.categoryId }.toSet()
    return categories.filter { it.id in used }.sortedBy { it.sortOrder }
}

/** Popup speaker options from the server's facets, in the listener's language; "Other" last. */
fun speakerOptionsFrom(facets: ContentFacets, isUrdu: Boolean): List<SpeakerOption> =
    facets.speakers.map { f ->
        val label = when {
            isUrdu && f.nameUr.isNotBlank() -> f.nameUr
            f.nameEn.isNotBlank() -> f.nameEn
            f.nameUr.isNotBlank() -> f.nameUr
            else -> if (isUrdu) OTHER_UR else OTHER_EN
        }
        SpeakerOption(f.key, label)
    }.sortedWith(compareBy<SpeakerOption> { it.key == OTHER_SPEAKER_KEY }.thenBy { it.label.lowercase() })

/** Popup category options from the server's category ids, in the app's normal order. */
fun categoryOptionsFrom(ids: List<String>, categories: List<CategoryEntity>): List<CategoryEntity> =
    categories.filter { it.id in ids.toSet() }.sortedBy { it.sortOrder }
