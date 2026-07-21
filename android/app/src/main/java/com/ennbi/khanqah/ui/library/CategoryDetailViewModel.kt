package com.khanqah.app.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.model.Progress
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CategoryDetailViewModel(
    private val contentRepo: ContentRepository,
    private val progressRepo: ProgressRepository,
    private val categoryId: String,
) : ViewModel() {

    val content = contentRepo.observeContent(categoryId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _progressMap = MutableStateFlow<Map<String, Progress>>(emptyMap())
    val progressMap = _progressMap.asStateFlow()

    init {
        viewModelScope.launch { try { contentRepo.refreshContent(categoryId) } catch (_: Exception) {} }
        viewModelScope.launch { try { _progressMap.value = progressRepo.loadAll() } catch (_: Exception) {} }
    }
}
