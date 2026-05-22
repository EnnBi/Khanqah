package com.khanqah.admin.ui.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.LiveSession
import com.khanqah.admin.data.repository.LiveRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class LiveViewModel(private val repo: LiveRepository) : ViewModel() {
    private val _currentSession = MutableStateFlow<LiveSession?>(null)
    val currentSession = _currentSession.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _currentSession.value = repo.getCurrent() } catch (_: Exception) {}
    }

    fun start(titleEn: String, titleUr: String, streamUrl: String) = viewModelScope.launch {
        try { _currentSession.value = repo.start(titleEn, titleUr, streamUrl) } catch (_: Exception) {}
    }

    fun end(id: String) = viewModelScope.launch {
        try {
            repo.end(id)
            _currentSession.value = null
        } catch (_: Exception) {}
    }
}
