package com.khanqah.admin.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Content
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.data.repository.BugRepository
import com.khanqah.admin.data.repository.ContentAdminRepository
import com.khanqah.admin.data.repository.ScheduleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import com.khanqah.admin.ui.live.nextUpcoming
import kotlinx.coroutines.launch

class HomeViewModel(
    private val contentRepo: ContentAdminRepository,
    private val scheduleRepo: ScheduleRepository,
    private val bugRepo: BugRepository,
) : ViewModel() {
    private val _contentCount = MutableStateFlow(0)
    val contentCount = _contentCount.asStateFlow()

    private val _recentContent = MutableStateFlow<List<Content>>(emptyList())
    val recentContent = _recentContent.asStateFlow()

    private val _nextSession = MutableStateFlow<ScheduledSession?>(null)
    val nextSession = _nextSession.asStateFlow()

    private val _openBugCount = MutableStateFlow(0)
    val openBugCount = _openBugCount.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            try {
                val all = contentRepo.listContent()   // ordered created_at DESC by backend
                _contentCount.value = all.size
                _recentContent.value = all.take(5)
            } catch (_: Exception) {}
        }
        viewModelScope.launch {
            try {
                _nextSession.value = scheduleRepo.list().nextUpcoming()
            } catch (_: Exception) {}
        }
        viewModelScope.launch {
            try {
                _openBugCount.value = bugRepo.list().count { it.status == "open" }
            } catch (_: Exception) {}
        }
    }
}
