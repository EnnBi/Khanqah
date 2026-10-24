package com.ennbi.khanqah.ui.player

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import com.ennbi.khanqah.KhanqahApp
import com.ennbi.khanqah.NowPlayingInfo
import com.ennbi.khanqah.data.model.Content
import com.ennbi.khanqah.data.repository.ContentRepository
import com.ennbi.khanqah.data.repository.ProgressRepository
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

    private val _player = MutableStateFlow<ExoPlayer?>(null)
    val playerState = _player.asStateFlow()

    private var playerOwned = true
    private var progressJob: Job? = null

    private val settings get() = (context.applicationContext as KhanqahApp).settingsStore

    init {
        // Apply the saved playback speed and keep it in sync if the user changes it.
        viewModelScope.launch { settings.playbackSpeed.collect { s -> _player.value?.setPlaybackSpeed(s) } }
    }

    private fun applyPlaybackSpeed() = viewModelScope.launch {
        _player.value?.setPlaybackSpeed(settings.playbackSpeedNow())
    }

    fun load(id: String) = viewModelScope.launch {
        val c = contentRepo.getContent(id)
        _content.value = c

        val isBook = c.type.lowercase() in setOf("book", "books") ||
                     c.mediaUrl.lowercase().endsWith(".pdf")
        if (isBook) return@launch

        val nowPlayingManager = (context.applicationContext as KhanqahApp).nowPlayingManager

        // Same content already playing in background — reuse that player
        if (nowPlayingManager.info.value?.contentId == id && nowPlayingManager.player != null) {
            _player.value = nowPlayingManager.player
            playerOwned = false
            applyPlaybackSpeed()
            return@launch
        }

        val saved = progressRepo.getLocal(id) ?: run {
            progressRepo.loadAll()
            progressRepo.getLocal(id)
        }

        val p = ExoPlayer.Builder(context)
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
        _player.value = p
        playerOwned = true
        applyPlaybackSpeed()

        p.setMediaItem(MediaItem.fromUri(c.mediaUrl))
        p.prepare()

        if (saved != null && !saved.completed && saved.positionSeconds > 0) {
            p.seekTo(saved.positionSeconds * 1000L)
        }
        p.play()

        nowPlayingManager.set(
            NowPlayingInfo(contentId = id, title = c.titleEn, type = c.type),
            p,
        )

        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_ENDED) {
                    viewModelScope.launch {
                        progressRepo.save(id, (p.duration / 1000).toInt(), completed = true)
                    }
                }
            }
        })

        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (true) {
                delay(10_000)
                val pos = (p.currentPosition / 1000).toInt()
                val dur = (p.duration / 1000).toInt()
                val completed = dur > 0 && pos >= (dur * 0.9).toInt()
                progressRepo.save(id, pos, completed)
            }
        }
    }

    override fun onCleared() {
        progressJob?.cancel()
        (context.applicationContext as KhanqahApp).nowPlayingManager.clear()
        if (playerOwned) _player.value?.release()
        super.onCleared()
    }
}
