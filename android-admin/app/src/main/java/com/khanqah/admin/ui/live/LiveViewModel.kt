package com.khanqah.admin.ui.live

import android.util.Log
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

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    private val _authExpired = MutableStateFlow(false)
    val authExpired = _authExpired.asStateFlow()

    private val streamer = AudioStreamer()

    init { refresh() }

    fun clearAuthExpired() { _authExpired.value = false }

    fun refresh() = viewModelScope.launch {
        try { _currentSession.value = repo.getCurrent() } catch (e: Exception) { Log.e("LiveVM", "getCurrent", e) }
        try { _categories.value = repo.listCategories() } catch (e: Exception) { Log.e("LiveVM", "listCategories", e) }
    }

    fun start(categoryId: String, titleEn: String, titleUr: String) = viewModelScope.launch {
        _error.value = null
        try {
            _currentSession.value = repo.start(categoryId, titleEn, titleUr)
            streamer.start(
                onReady = { _isStreaming.value = true },
                onError = { msg -> _error.value = msg; Log.e("LiveVM", "stream error: $msg") },
            )
        } catch (e: Exception) {
            Log.e("LiveVM", "start failed", e)
            if (e.message?.contains("401") == true) {
                _authExpired.value = true
            } else {
                _error.value = e.message ?: "Failed to start session"
            }
        }
    }

    fun end(id: String) = viewModelScope.launch {
        try {
            streamer.stop()
            _isStreaming.value = false
            repo.end(id)
            _currentSession.value = null
        } catch (e: Exception) { Log.e("LiveVM", "end failed", e) }
    }

    override fun onCleared() {
        super.onCleared()
        streamer.stop()
    }
}
