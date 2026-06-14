package com.khanqah.admin.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.NotificationSetting
import com.khanqah.admin.data.repository.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(private val repo: SettingsRepository) : ViewModel() {
    private val _settings = MutableStateFlow<List<NotificationSetting>>(emptyList())
    val settings = _settings.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _settings.value = repo.listNotificationSettings() } catch (_: Exception) {}
    }

    fun toggle(key: String, enabled: Boolean) = viewModelScope.launch {
        // optimistic update
        _settings.value = _settings.value.map { if (it.key == key) it.copy(enabled = enabled) else it }
        try {
            repo.setNotificationEnabled(key, enabled)
        } catch (_: Exception) {
            // revert on failure
            _settings.value = _settings.value.map { if (it.key == key) it.copy(enabled = !enabled) else it }
        }
    }
}
