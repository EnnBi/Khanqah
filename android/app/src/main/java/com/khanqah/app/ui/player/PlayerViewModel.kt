package com.khanqah.app.ui.player

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import com.khanqah.app.data.model.Content
import com.khanqah.app.data.repository.ContentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PlayerViewModel(private val repo: ContentRepository, private val context: Context) : ViewModel() {
    private val _content = MutableStateFlow<Content?>(null)
    val content = _content.asStateFlow()

    val player: ExoPlayer = ExoPlayer.Builder(context).build()

    fun load(id: String) = viewModelScope.launch {
        val c = repo.getContent(id)
        _content.value = c
        player.setMediaItem(MediaItem.fromUri(c.mediaUrl))
        player.prepare()
        player.play()
    }

    override fun onCleared() {
        player.release()
        super.onCleared()
    }
}
