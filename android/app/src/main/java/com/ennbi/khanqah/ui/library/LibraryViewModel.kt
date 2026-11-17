package com.ennbi.khanqah.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ennbi.khanqah.data.db.entities.ContentEntity
import com.ennbi.khanqah.data.repository.CategoryRepository
import com.ennbi.khanqah.data.repository.ContentRepository
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

    fun setSearchQuery(q: String) { _filter.update { it.copy(query = q) } }
    fun setFilter(f: ContentFilter) { _filter.value = f }

    init {
        viewModelScope.launch { categoryRepo.refresh() }
    }
}
