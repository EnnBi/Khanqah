package com.ennbi.khanqah.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ennbi.khanqah.data.db.entities.ContentEntity
import com.ennbi.khanqah.data.model.ContentFacets
import com.ennbi.khanqah.data.repository.CategoryRepository
import com.ennbi.khanqah.data.repository.ContentRepository
import com.ennbi.khanqah.data.retryOnNetworkError
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class LibraryViewModel(
    private val categoryRepo: CategoryRepository,
    private val contentRepo: ContentRepository,
) : ViewModel() {

    val categories = categoryRepo.observeCategories()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    private val _filter = MutableStateFlow(ContentFilter())
    val filter: StateFlow<ContentFilter> = _filter.asStateFlow()

    /** Everything cached on the phone: the pool the search and filters run over. */
    val allContent: StateFlow<List<ContentEntity>> = contentRepo.observeContent()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    /** Matches for the current search/filters; empty while nothing is being searched. */
    val searchResults: StateFlow<List<ContentEntity>> = combine(allContent, _filter) { items, f ->
        if (f.isActive) items.applyFilter(f) else emptyList()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    /** Server-side search over the whole library, paged; the cached results above are the offline fallback. */
    val search = PagedSearch(viewModelScope) { f, offset, limit ->
        contentRepo.searchPage(f.query, f.categoryId, f.speakerKey, offset, limit)
    }
    fun loadMore() = search.loadMore()

    private val _facets = MutableStateFlow<ContentFacets?>(null)
    val facets: StateFlow<ContentFacets?> = _facets.asStateFlow()

    fun setSearchQuery(q: String) = setFilter(_filter.value.copy(query = q))
    fun setFilter(f: ContentFilter) { _filter.value = f; search.setFilter(f) }

    private val _loadState = MutableStateFlow(LoadState.Loading)
    /** Whether the category list has come back from the server; drives the empty-tab placeholder. */
    val loadState: StateFlow<LoadState> = _loadState.asStateFlow()
    private var refreshJob: Job? = null

    /** Loads the categories now, retrying with backoff until the server answers. */
    fun refresh() {
        refreshJob?.cancel()
        _loadState.value = LoadState.Loading
        refreshJob = viewModelScope.launch {
            retryOnNetworkError(onFailure = { _loadState.value = LoadState.Failed }) { categoryRepo.refresh() }
            _loadState.value = LoadState.Loaded
            if (_facets.value == null) _facets.value = contentRepo.facets()
        }
    }

    init {
        refresh()
        viewModelScope.launch { _facets.value = contentRepo.facets() }
    }
}

enum class LoadState { Loading, Failed, Loaded }
