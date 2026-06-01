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

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _sessions.value = repo.list() } catch (_: Exception) {}
    }

    fun create(
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
    ) = viewModelScope.launch {
        try {
            val new = repo.create(titleEn, titleUr, scheduledAt, isRecurring, recurrenceRule)
            _sessions.value = _sessions.value + new
        } catch (_: Exception) {}
    }

    fun update(
        id: String,
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
    ) = viewModelScope.launch {
        try {
            val updated = repo.update(id, titleEn, titleUr, scheduledAt, isRecurring, recurrenceRule)
            _sessions.value = _sessions.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun delete(id: String) = viewModelScope.launch {
        try {
            repo.delete(id)
            _sessions.value = _sessions.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
