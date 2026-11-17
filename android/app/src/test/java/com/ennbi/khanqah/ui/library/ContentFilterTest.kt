package com.ennbi.khanqah.ui.library

import com.ennbi.khanqah.data.db.entities.CategoryEntity
import com.ennbi.khanqah.data.db.entities.ContentEntity
import org.junit.Assert.assertEquals
import org.junit.Test

class ContentFilterTest {
    private fun item(
        id: String, titleEn: String = "T$id", titleUr: String = "", category: String = "c1",
        creditEn: String? = null, creditUr: String? = null,
    ) = ContentEntity(
        id = id, titleEn = titleEn, titleUr = titleUr, mediaUrl = "", thumbnailUrl = null,
        type = "bayan", categoryId = category, isVideo = false, duration = null,
        creditEn = creditEn, creditUr = creditUr,
    )

    private val items = listOf(
        item("1", titleEn = "Faiz Yaftah", creditEn = "Mufti Rashid", creditUr = "مفتی رشید"),
        item("2", titleEn = "Sohbat", category = "c2", creditEn = "Maulana Ahmad", creditUr = "مولانا احمد"),
        item("3", titleEn = "Dua", titleUr = "دعا", category = "c2"),
    )

    private fun ids(f: ContentFilter) = items.applyFilter(f).map { it.id }

    @Test fun emptyFilterKeepsEverything() = assertEquals(listOf("1", "2", "3"), ids(ContentFilter()))

    @Test fun queryMatchesTitleEnglishAndUrdu() {
        assertEquals(listOf("1"), ids(ContentFilter(query = "faiz")))
        assertEquals(listOf("3"), ids(ContentFilter(query = "دعا")))
    }

    @Test fun queryMatchesSpeaker() {
        assertEquals(listOf("2"), ids(ContentFilter(query = "ahmad")))
        assertEquals(listOf("1"), ids(ContentFilter(query = "مفتی")))
    }

    @Test fun categoryFilter() = assertEquals(listOf("2", "3"), ids(ContentFilter(categoryId = "c2")))

    @Test fun speakerFilterIsCaseInsensitive() =
        assertEquals(listOf("1"), ids(ContentFilter(speakerKey = "MUFTI RASHID")))

    @Test fun otherSpeakerMatchesItemsWithNoCredit() =
        assertEquals(listOf("3"), ids(ContentFilter(speakerKey = OTHER_SPEAKER_KEY)))

    @Test fun filtersCombine() =
        assertEquals(listOf("2"), ids(ContentFilter(query = "soh", categoryId = "c2", speakerKey = "Maulana Ahmad")))

    @Test fun activeAndFacetCount() {
        assertEquals(false, ContentFilter().isActive)
        assertEquals(true, ContentFilter(query = "x").isActive)
        assertEquals(0, ContentFilter(query = "x").facetCount)
        assertEquals(2, ContentFilter(categoryId = "c", speakerKey = "s").facetCount)
    }

    @Test fun speakerOptionsAreDistinctLocalisedAndOtherLast() {
        val en = speakerOptions(items + item("4", creditEn = "mufti rashid"), isUrdu = false)
        assertEquals(listOf("Maulana Ahmad", "Mufti Rashid", "Other"), en.map { it.label })
        val ur = speakerOptions(items, isUrdu = true)
        assertEquals(setOf("مولانا احمد", "مفتی رشید", "دیگر"), ur.map { it.label }.toSet())
        assertEquals("دیگر", ur.last().label)
    }

    @Test fun categoryOptionsOnlyThoseWithContent() {
        val cats = listOf(
            CategoryEntity("c1", "One", "ایک", "bayan", null, 2),
            CategoryEntity("c2", "Two", "دو", "bayan", null, 1),
            CategoryEntity("c3", "Empty", "خالی", "bayan", null, 0),
        )
        assertEquals(listOf("c2", "c1"), categoryOptions(items, cats).map { it.id })
    }
}
