package com.khanqah.admin.ui.team

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.User
import com.khanqah.admin.data.repository.TeamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TeamViewModel(private val repo: TeamRepository) : ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users = _users.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _users.value = repo.list() } catch (_: Exception) {}
    }

    fun updateRole(id: String, role: String) = viewModelScope.launch {
        try {
            val updated = repo.updateRole(id, role)
            _users.value = _users.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun updateName(id: String, name: String) = viewModelScope.launch {
        try {
            val updated = repo.updateName(id, name)
            _users.value = _users.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun deleteUser(id: String) = viewModelScope.launch {
        try {
            repo.deleteUser(id)
            _users.value = _users.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
