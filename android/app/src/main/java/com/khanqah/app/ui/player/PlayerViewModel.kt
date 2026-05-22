package com.khanqah.app.ui.player

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import com.khanqah.app.data.model.Content
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PlayerViewModel(
    private val contentRepo: ContentRepository,
    private val progressRepo: ProgressRepository,
    private val context: Context,
) : ViewModel() {

    private val _content = MutableStateFlow<Content?>(null)
    val content = _content.asStateFlow()

    val player: ExoPlayer = ExoPlayer.Builder(context)
        .setLoadControl(
            DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    DefaultLoadControl.DEFAULT_MIN_BUFFER_MS,
                    DefaultLoadControl.DEFAULT_MAX_BUFFER_MS,
                    1_500,
                    DefaultLoadControl.DEFAULT_BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS,
                )
                .build()
        )
        .build()
    private var progressJob: Job? = null

    fun load(id: String) = viewModelScope.launch {
        val c = contentRepo.getContent(id)
        _content.value = c

        val isBook = c.type.lowercase() in setOf("book", "books") ||
                     c.mediaUrl.lowercase().endsWith(".pdf")
        if (isBook) return@launch

        val saved = progressRepo.getLocal(id) ?: run {
            progressRepo.loadAll()
            progressRepo.getLocal(id)
        }

        player.setMediaItem(MediaItem.fromUri(c.mediaUrl))
        player.prepare()

        if (saved != null && !saved.completed && saved.positionSeconds > 0) {
            player.seekTo(saved.positionSeconds * 1000L)
        }
        player.play()

        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_ENDED) {
                    viewModelScope.launch {
                        progressRepo.save(id, (player.duration / 1000).toInt(), completed = true)
                    }
                }
            }
        })

        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (true) {
                delay(10_000)
                val pos = (player.currentPosition / 1000).toInt()
                val dur = (player.duration / 1000).toInt()
                val completed = dur > 0 && pos >= (dur * 0.9).toInt()
                progressRepo.save(id, pos, completed)
            }
        }
    }

    override fun onCleared() {
        progressJob?.cancel()
        player.release()
        super.onCleared()
    }
}
