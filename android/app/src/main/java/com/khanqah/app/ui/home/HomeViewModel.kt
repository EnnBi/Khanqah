package com.khanqah.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.model.LiveSession
import com.khanqah.app.data.model.ScheduledSession
import com.khanqah.app.data.repository.ContentRepository
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
        viewModelScope.launch { contentRepo.refreshContent() }
        viewModelScope.launch { try { _schedule.value = api.listSchedule() } catch (_: Exception) {} }
        viewModelScope.launch { pollLive() }
    }

    private suspend fun pollLive() {
        while (true) {
            _live.value = try {
                api.getCurrentLive()
            } catch (e: retrofit2.HttpException) {
                if (e.code() == 404) null else _live.value
            } catch (_: Exception) {
                _live.value
            }
            delay(30_000)
        }
    }

    suspend fun pingLive(): Int = try { api.pingLive()["listeners"] ?: 0 } catch (_: Exception) { 0 }
    suspend fun leaveLive() { try { api.leaveLive() } catch (_: Exception) {} }
    suspend fun isLiveActive(): Boolean {
        return try {
            api.getCurrentLive() != null
        } catch (e: retrofit2.HttpException) {
            e.code() != 404  // 404 = no active session
        } catch (_: Exception) {
            true  // network error — assume still live
        }
    }
}
