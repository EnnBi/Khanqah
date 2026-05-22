package com.khanqah.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.model.LiveSession
import com.khanqah.app.data.model.ScheduledSession
import com.khanqah.app.data.repository.ContentRepository
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
        viewModelScope.launch { try { _live.value = api.getCurrentLive() } catch (_: Exception) {} }
        viewModelScope.launch { try { _schedule.value = api.listSchedule() } catch (_: Exception) {} }
    }
}
