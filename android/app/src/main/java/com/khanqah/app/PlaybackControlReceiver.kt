package com.khanqah.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class PlaybackControlReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = (context.applicationContext as? KhanqahApp)?.nowPlayingManager ?: return
        when (intent.action) {
            ACTION_TOGGLE -> {
                val player = manager.player ?: return
                if (player.isPlaying) player.pause() else player.play()
            }
            ACTION_STOP -> manager.stopAndClear()
        }
    }

    companion object {
        const val ACTION_TOGGLE = "com.khanqah.app.PLAYBACK_TOGGLE"
        const val ACTION_STOP   = "com.khanqah.app.PLAYBACK_STOP"
    }
}
