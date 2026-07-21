package com.khanqah.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.repository.AuthRepository
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
        try {
            repo.sendOtp(phone)
            _state.value = AuthState.OtpSent
        } catch (e: Exception) {
            val msg = when {
                e.message?.contains("429") == true -> "Too many attempts. Try again in 10 minutes."
                e.message?.contains("400") == true -> "Invalid phone number."
                else -> "Failed to send OTP. Check your connection."
            }
            _state.value = AuthState.Error(msg)
        }
    }

    fun verifyOtp(phone: String, otp: String, name: String = "") = viewModelScope.launch {
        _state.value = AuthState.Loading
        try {
            repo.verifyOtp(phone, otp, name)
            _state.value = AuthState.Success
        } catch (e: Exception) {
            val msg = when {
                e.message?.contains("401") == true -> "Invalid OTP. Please try again."
                else -> "Verification failed. Check your connection."
            }
            _state.value = AuthState.Error(msg)
        }
    }

    fun reset() { _state.value = AuthState.Idle }
}
