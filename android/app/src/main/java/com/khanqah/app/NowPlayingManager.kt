package com.khanqah.app

import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class NowPlayingInfo(
    val contentId: String,
    val title: String,
    val type: String,
)

class NowPlayingManager {
    private val _info = MutableStateFlow<NowPlayingInfo?>(null)
    val info = _info.asStateFlow()

    var player: ExoPlayer? = null
        private set

    fun set(info: NowPlayingInfo, player: ExoPlayer) {
        _info.value = info
        this.player = player
    }

    fun clear() {
        _info.value = null
        player = null
    }
}
