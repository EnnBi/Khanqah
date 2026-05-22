package com.khanqah.admin.ui.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.LiveSession
import com.khanqah.admin.data.repository.LiveRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class LiveViewModel(private val repo: LiveRepository) : ViewModel() {
    private val _currentSession = MutableStateFlow<LiveSession?>(null)
    val currentSession = _currentSession.asStateFlow()

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories = _categories.asStateFlow()

    private val _isStreaming = MutableStateFlow(false)
    val isStreaming = _isStreaming.asStateFlow()

    private val streamer = AudioStreamer()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _currentSession.value = repo.getCurrent() } catch (_: Exception) {}
        try { _categories.value = repo.listCategories() } catch (_: Exception) {}
    }

    fun start(categoryId: String, titleEn: String, titleUr: String) = viewModelScope.launch {
        try {
            _currentSession.value = repo.start(categoryId, titleEn, titleUr)
            streamer.start(
                onReady = { _isStreaming.value = true },
                onError = { _isStreaming.value = false },
            )
        } catch (_: Exception) {}
    }

    fun end(id: String) = viewModelScope.launch {
        try {
            streamer.stop()
            _isStreaming.value = false
            repo.end(id)
            _currentSession.value = null
        } catch (_: Exception) {}
    }

    override fun onCleared() {
        super.onCleared()
        streamer.stop()
    }
}
