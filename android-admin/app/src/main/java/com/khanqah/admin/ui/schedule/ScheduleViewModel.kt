package com.khanqah.admin.ui.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.data.repository.ScheduleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ScheduleViewModel(private val repo: ScheduleRepository) : ViewModel() {
    private val _sessions = MutableStateFlow<List<ScheduledSession>>(emptyList())
    val sessions = _sessions.asStateFlow()

    init { viewModelScope.launch { _sessions.value = repo.list() } }

    fun create(titleEn: String, titleUr: String, scheduledAt: String) = viewModelScope.launch {
        val new = repo.create(titleEn, titleUr, scheduledAt)
        _sessions.value = _sessions.value + new
    }

    fun delete(id: String) = viewModelScope.launch {
        repo.delete(id)
        _sessions.value = _sessions.value.filter { it.id != id }
    }
}
