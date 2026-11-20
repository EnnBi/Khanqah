package com.ennbi.khanqah.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ennbi.khanqah.data.api.ApiService
import com.ennbi.khanqah.data.model.LiveSession
import com.ennbi.khanqah.data.model.ScheduledSession
import com.ennbi.khanqah.data.repository.ContentRepository
import com.ennbi.khanqah.data.retryOnNetworkError
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HomeViewModel(
    private val contentRepo: ContentRepository,
    private val api: ApiService,
) : ViewModel() {
    val content = contentRepo.observeContent()
    private val _live = MutableStateFlow<LiveSession?>(null)
    val live = _live.asStateFlow()
    private val _schedule = MutableStateFlow<List<ScheduledSession>>(emptyList())
    val schedule = _schedule.asStateFlow()

    init {
        // This view model lives as long as the app, so these run once: keep trying until they succeed.
        viewModelScope.launch { retryOnNetworkError { contentRepo.refreshContent() } }
        viewModelScope.launch {
            try { retryOnNetworkError { _schedule.value = api.listSchedule() } } catch (_: Exception) {}
        }
        viewModelScope.launch { pollLive() }
    }

    private suspend fun pollLive() {
        while (true) {
            try {
                val response = api.getCurrentLive()
                if (response.isSuccessful) _live.value = response.body()
            } catch (_: Exception) {
                // network error — keep current value, try again next cycle
            }
            delay(10_000)
        }
    }

    /**
     * Checks what is on air right now instead of waiting for the next poll, for opening a shared
     * broadcast link. Returns false, leaving [live] untouched, if the server could not be reached.
     */
    suspend fun refreshLive(): Boolean = try {
        val response = api.getCurrentLive()
        if (response.isSuccessful) _live.value = response.body()
        response.isSuccessful
    } catch (_: Exception) {
        false
    }

    suspend fun pingLive(): Int = try { api.pingLive()["listeners"] ?: 0 } catch (_: Exception) { 0 }
    suspend fun leaveLive() { try { api.leaveLive() } catch (_: Exception) {} }
    suspend fun isLiveActive(): Boolean {
        return try {
            val response = api.getCurrentLive()
            response.isSuccessful && response.body() != null
        } catch (_: Exception) {
            true  // network error — assume still live
        }
    }
}
