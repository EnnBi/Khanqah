package com.khanqah.admin.ui.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.repository.CategoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CategoryViewModel(private val repo: CategoryRepository) : ViewModel() {
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories = _categories.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _categories.value = repo.list() } catch (_: Exception) {}
    }

    fun create(nameEn: String, nameUr: String) = viewModelScope.launch {
        try {
            val new = repo.create(nameEn, nameUr)
            _categories.value = _categories.value + new
        } catch (_: Exception) {}
    }

    fun update(id: String, nameEn: String, nameUr: String) = viewModelScope.launch {
        try {
            val updated = repo.update(id, nameEn, nameUr)
            _categories.value = _categories.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun delete(id: String) = viewModelScope.launch {
        try {
            repo.delete(id)
            _categories.value = _categories.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
