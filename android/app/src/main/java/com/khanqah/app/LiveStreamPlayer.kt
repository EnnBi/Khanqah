package com.khanqah.app

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

class LiveStreamPlayer {
    var player: ExoPlayer? = null
        private set

    fun ensure(url: String, context: Context) {
        if (player != null) return
        player = ExoPlayer.Builder(context.applicationContext).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            prepare()
            play()
        }
    }

    fun release() {
        player?.release()
        player = null
    }
}
