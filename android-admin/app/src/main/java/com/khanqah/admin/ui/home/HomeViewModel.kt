package com.khanqah.admin.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.data.repository.BugRepository
import com.khanqah.admin.data.repository.ContentAdminRepository
import com.khanqah.admin.data.repository.ScheduleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant

class HomeViewModel(
    private val contentRepo: ContentAdminRepository,
    private val scheduleRepo: ScheduleRepository,
    private val bugRepo: BugRepository,
) : ViewModel() {
    private val _contentCount = MutableStateFlow(0)
    val contentCount = _contentCount.asStateFlow()

    private val _nextSession = MutableStateFlow<ScheduledSession?>(null)
    val nextSession = _nextSession.asStateFlow()

    private val _openBugCount = MutableStateFlow(0)
    val openBugCount = _openBugCount.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            try { _contentCount.value = contentRepo.listContent().size } catch (_: Exception) {}
        }
        viewModelScope.launch {
            try {
                val now = Instant.now()
                _nextSession.value = scheduleRepo.list()
                    .filter { s ->
                        runCatching { Instant.parse(s.scheduledAt).isAfter(now) }.getOrDefault(false)
                            || s.isRecurring
                    }
                    .minByOrNull { s ->
                        runCatching { Instant.parse(s.scheduledAt).toEpochMilli() }.getOrDefault(Long.MAX_VALUE)
                    }
            } catch (_: Exception) {}
        }
        viewModelScope.launch {
            try {
                _openBugCount.value = bugRepo.list().count { it.status == "open" }
            } catch (_: Exception) {}
        }
    }
}
