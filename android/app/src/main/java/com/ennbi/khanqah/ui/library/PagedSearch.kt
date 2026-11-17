package com.ennbi.khanqah.ui.library

import com.ennbi.khanqah.data.db.entities.ContentEntity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Server-side search results for a [ContentFilter], loaded a page at a time.
 * Typing is debounced; popup filters apply at once. While the filter is inactive nothing is fetched.
 * [State.failed] lets the screen fall back to filtering what's cached on the phone.
 */
@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
class PagedSearch(
    private val scope: CoroutineScope,
    private val pageSize: Int = 30,
    private val debounceMs: Long = 300,
    private val fetch: suspend (filter: ContentFilter, offset: Int, limit: Int) -> List<ContentEntity>,
) {
    data class State(
        val items: List<ContentEntity> = emptyList(),
        val loading: Boolean = false,
        val endReached: Boolean = false,
        val failed: Boolean = false,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    private val filter = MutableStateFlow(ContentFilter())
    private var current = ContentFilter()

    init {
        scope.launch {
            filter
                .debounce { if (it.query.isBlank()) 0L else debounceMs }
                .distinctUntilChanged()
                .collectLatest { load(it, reset = true) }
        }
    }

    fun setFilter(f: ContentFilter) { filter.value = f }

    fun loadMore() {
        val f = current
        val s = _state.value
        if (!f.isActive || s.loading || s.endReached || s.failed) return
        scope.launch { load(f, reset = false) }
    }

    private suspend fun load(f: ContentFilter, reset: Boolean) {
        if (reset) {
            current = f
            _state.value = State(loading = f.isActive)
        } else {
            _state.update { it.copy(loading = true) }
        }
        if (!f.isActive) return
        val offset = if (reset) 0 else _state.value.items.size
        try {
            val page = fetch(f, offset, pageSize)
            if (current != f) return // the filter changed while this page was loading
            _state.update {
                State(
                    items = if (reset) page else it.items + page,
                    endReached = page.size < pageSize,
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            if (current == f) _state.update { it.copy(loading = false, failed = true) }
        }
    }
}
