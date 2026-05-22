package com.khanqah.app.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.db.entities.ContentEntity
import com.khanqah.app.data.repository.CategoryRepository
import com.khanqah.app.data.repository.ContentRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryViewModel(
    private val categoryRepo: CategoryRepository,
    private val contentRepo: ContentRepository,
) : ViewModel() {

    val categories = categoryRepo.observeCategories()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val searchResults: StateFlow<List<ContentEntity>> = _searchQuery
        .flatMapLatest { q ->
            if (q.isBlank()) flowOf(emptyList())
            else contentRepo.searchContent(q)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setSearchQuery(q: String) { _searchQuery.value = q }

    init {
        viewModelScope.launch { categoryRepo.refresh() }
    }
}
