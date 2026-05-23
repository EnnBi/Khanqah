package com.khanqah.admin.ui.live

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.LiveSession
import com.khanqah.admin.data.repository.LiveRepository
import kotlinx.coroutines.delay
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

    private val _listenerCount = MutableStateFlow(0)
    val listenerCount = _listenerCount.asStateFlow()

    private val streamer = AudioStreamer()

    init {
        refresh()
        pollListeners()
    }

    private fun pollListeners() = viewModelScope.launch {
        while (true) {
            delay(10_000)
            if (_currentSession.value != null) {
                _listenerCount.value = repo.getListeners()
            }
        }
    }

    fun clearAuthExpired() { _authExpired.value = false }
    fun clearError() { _error.value = null }

    fun refresh() = viewModelScope.launch {
        try { _currentSession.value = repo.getCurrent() } catch (e: Exception) { Log.e("LiveVM", "getCurrent", e) }
        try { _categories.value = repo.listCategories() } catch (e: Exception) { Log.e("LiveVM", "listCategories", e) }
    }

    fun start(categoryId: String, titleEn: String, titleUr: String, record: Boolean = false) = viewModelScope.launch {
        _error.value = null
        try {
            val session = repo.start(categoryId, titleEn, titleUr)
            _currentSession.value = session
            streamer.start(
                sessionId = session.id,
                categoryId = categoryId,
                record = record,
                onReady = { _isStreaming.value = true },
                onError = { msg -> _error.value = msg; Log.e("LiveVM", "stream error: $msg") },
            )
        } catch (e: Exception) {
            Log.e("LiveVM", "start failed", e)
            if (e.message?.contains("401") == true) {
                _authExpired.value = true
            } else {
                _error.value = when {
                    e.message?.contains("connect") == true ||
                    e.message?.contains("timeout") == true ||
                    e.message?.contains("failed") == true -> "Could not reach server. Check your connection."
                    else -> "Failed to start session. Please try again."
                }
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
