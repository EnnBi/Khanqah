package com.khanqah.admin.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface AuthState {
    object Idle : AuthState
    object Loading : AuthState
    object OtpSent : AuthState
    object Success : AuthState
    data class Error(val message: String) : AuthState
}

class AuthViewModel(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow<AuthState>(AuthState.Idle)
    val state = _state.asStateFlow()

    fun sendOtp(phone: String) = viewModelScope.launch {
        _state.value = AuthState.Loading
        try { repo.sendOtp(phone); _state.value = AuthState.OtpSent }
        catch (e: Exception) { _state.value = AuthState.Error(e.message ?: "Failed to send OTP") }
    }

    fun verifyOtp(phone: String, otp: String) = viewModelScope.launch {
        _state.value = AuthState.Loading
        repo.verifyOtp(phone, otp)
            .onSuccess { _state.value = AuthState.Success }
            .onFailure { _state.value = AuthState.Error(it.message ?: "Failed") }
    }
}
