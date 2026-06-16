package com.khanqah.shaykh.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.shaykh.data.repository.AuthRepository
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
        catch (e: Exception) {
            val msg = when {
                e.message?.contains("429") == true -> "بہت زیادہ کوششیں۔ ۱۰ منٹ بعد دوبارہ کوشش کریں۔"
                e.message?.contains("400") == true -> "فون نمبر درست نہیں۔"
                else -> "OTP بھیجنے میں ناکامی۔ انٹرنیٹ چیک کریں۔"
            }
            _state.value = AuthState.Error(msg)
        }
    }

    fun verifyOtp(phone: String, otp: String) = viewModelScope.launch {
        _state.value = AuthState.Loading
        repo.verifyOtp(phone, otp)
            .onSuccess { _state.value = AuthState.Success }
            .onFailure { e ->
                val msg = when {
                    e.message?.contains("401") == true -> "OTP غلط ہے۔ دوبارہ کوشش کریں۔"
                    e.message?.contains("403") == true -> "رسائی نہیں۔"
                    else -> "تصدیق ناکام۔ انٹرنیٹ چیک کریں۔"
                }
                _state.value = AuthState.Error(msg)
            }
    }

    fun logout() = viewModelScope.launch { repo.logout() }

    fun reset() { _state.value = AuthState.Idle }
}
