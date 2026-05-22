package com.khanqah.admin.ui.bugs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.BugReport
import com.khanqah.admin.data.repository.BugRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BugsViewModel(private val repo: BugRepository) : ViewModel() {
    private val _reports = MutableStateFlow<List<BugReport>>(emptyList())
    val reports = _reports.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _reports.value = repo.list() } catch (_: Exception) {}
    }
}
