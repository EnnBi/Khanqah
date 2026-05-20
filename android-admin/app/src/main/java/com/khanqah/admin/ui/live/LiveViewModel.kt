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

    init { viewModelScope.launch { _currentSession.value = repo.getCurrent() } }

    fun start(titleEn: String, titleUr: String, streamUrl: String) = viewModelScope.launch {
        _currentSession.value = repo.start(titleEn, titleUr, streamUrl)
    }

    fun end(id: String) = viewModelScope.launch {
        repo.end(id)
        _currentSession.value = null
    }
}
