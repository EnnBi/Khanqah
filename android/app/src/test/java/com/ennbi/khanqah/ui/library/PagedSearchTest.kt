package com.ennbi.khanqah.ui.library

import com.ennbi.khanqah.data.db.entities.ContentEntity
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PagedSearchTest {
    // advanceUntilIdle() ignores work in backgroundScope (where the search runs), so advance explicitly.
    private suspend fun TestScope.settle() { advanceTimeBy(1_000); runCurrent() }

    private fun item(id: Int) = ContentEntity(
        id = "$id", titleEn = "T$id", titleUr = "", mediaUrl = "", thumbnailUrl = null,
        type = "bayan", categoryId = "c", isVideo = false, duration = null,
    )

    /** 70 items total; records every (filter, offset, limit) call. */
    private class Fake(val total: Int = 70) {
        val calls = mutableListOf<Triple<ContentFilter, Int, Int>>()
        suspend fun fetch(f: ContentFilter, offset: Int, limit: Int): List<ContentEntity> {
            calls += Triple(f, offset, limit)
            return (offset until minOf(offset + limit, total)).map { i ->
                ContentEntity("$i", "T$i", "", "", null, "bayan", "c", false, null)
            }
        }
    }

    @Test fun inactiveFilterFetchesNothing() = runTest {
        val fake = Fake()
        val s = PagedSearch(backgroundScope, pageSize = 30, debounceMs = 300, fetch = fake::fetch)
        s.setFilter(ContentFilter())
        settle()
        assertTrue(fake.calls.isEmpty())
        assertEquals(emptyList<ContentEntity>(), s.state.value.items)
        assertFalse(s.state.value.loading)
    }

    @Test fun queryIsDebouncedThenLoadsFirstPage() = runTest {
        val fake = Fake()
        val s = PagedSearch(backgroundScope, pageSize = 30, debounceMs = 300, fetch = fake::fetch)
        s.setFilter(ContentFilter(query = "f"))
        advanceTimeBy(100)
        s.setFilter(ContentFilter(query = "fa"))
        advanceTimeBy(100)
        assertTrue("still within the debounce window", fake.calls.isEmpty())
        settle()
        assertEquals(1, fake.calls.size)
        assertEquals(ContentFilter(query = "fa"), fake.calls[0].first)
        assertEquals(30, s.state.value.items.size)
        assertFalse(s.state.value.endReached)
    }

    @Test fun facetFilterLoadsImmediately() = runTest {
        val fake = Fake()
        val s = PagedSearch(backgroundScope, pageSize = 30, debounceMs = 300, fetch = fake::fetch)
        s.setFilter(ContentFilter(speakerKey = "x"))
        advanceTimeBy(1)
        assertEquals(1, fake.calls.size)
    }

    @Test fun loadMoreAppendsUntilShortPage() = runTest {
        val fake = Fake(total = 70)
        val s = PagedSearch(backgroundScope, pageSize = 30, debounceMs = 0, fetch = fake::fetch)
        s.setFilter(ContentFilter(speakerKey = "x"))
        settle()
        s.loadMore(); settle()
        assertEquals(60, s.state.value.items.size)
        assertFalse(s.state.value.endReached)
        s.loadMore(); settle()
        assertEquals(70, s.state.value.items.size)
        assertTrue(s.state.value.endReached)
        s.loadMore(); settle()
        assertEquals("no fetch once the end is reached", 3, fake.calls.size)
        assertEquals(listOf(0, 30, 60), fake.calls.map { it.second })
    }

    @Test fun changingFilterDropsStaleResults() = runTest {
        val gate = CompletableDeferred<Unit>()
        var slow = true
        val s = PagedSearch(backgroundScope, pageSize = 30, debounceMs = 0, fetch = { f, _, _ ->
            if (slow) { slow = false; gate.await() }
            listOf(item(if (f.speakerKey == "old") 1 else 2))
        })
        s.setFilter(ContentFilter(speakerKey = "old"))
        settle()
        s.setFilter(ContentFilter(speakerKey = "new"))
        settle()
        gate.complete(Unit)
        settle()
        assertEquals(listOf("2"), s.state.value.items.map { it.id })
    }

    @Test fun failureIsReported() = runTest {
        val s = PagedSearch(backgroundScope, pageSize = 30, debounceMs = 0, fetch = { _, _, _ -> error("offline") })
        s.setFilter(ContentFilter(speakerKey = "x"))
        settle()
        assertTrue(s.state.value.failed)
        assertFalse(s.state.value.loading)
    }
}
