package com.khanqah.admin.ui.content

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.Content
import com.khanqah.admin.data.repository.ContentAdminRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ContentViewModel(private val repo: ContentAdminRepository) : ViewModel() {
    private val _items = MutableStateFlow<List<Content>>(emptyList())
    val items = _items.asStateFlow()
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories = _categories.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch { try { _items.value = repo.listContent() } catch (_: Exception) {} }
        viewModelScope.launch { try { _categories.value = repo.listCategories() } catch (_: Exception) {} }
    }

    fun delete(id: String) = viewModelScope.launch {
        try {
            repo.deleteContent(id)
            _items.value = _items.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
