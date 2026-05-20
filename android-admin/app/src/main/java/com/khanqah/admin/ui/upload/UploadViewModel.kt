package com.khanqah.admin.ui.upload

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.repository.UploadRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface UploadState {
    object Idle : UploadState
    data class Uploading(val progress: Int) : UploadState
    object Done : UploadState
    data class Error(val message: String) : UploadState
}

class UploadViewModel(private val repo: UploadRepository) : ViewModel() {
    private val _state = MutableStateFlow<UploadState>(UploadState.Idle)
    val state = _state.asStateFlow()

    fun upload(
        uri: Uri, filename: String, mimeType: String,
        titleEn: String, titleUr: String, type: String,
        categoryId: String, isVideo: Boolean,
    ) = viewModelScope.launch {
        _state.value = UploadState.Uploading(0)
        try {
            repo.uploadAndCreate(
                uri, filename, mimeType, titleEn, titleUr, type, categoryId, isVideo,
                onProgress = { _state.value = UploadState.Uploading(it) },
            )
            _state.value = UploadState.Done
        } catch (e: Exception) {
            _state.value = UploadState.Error(e.message ?: "Upload failed")
        }
    }

    fun reset() { _state.value = UploadState.Idle }
}
