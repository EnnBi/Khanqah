package com.khanqah.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class PlaybackControlReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_TOGGLE) return
        val player = (context.applicationContext as? KhanqahApp)?.nowPlayingManager?.player ?: return
        if (player.isPlaying) player.pause() else player.play()
    }

    companion object {
        const val ACTION_TOGGLE = "com.khanqah.app.PLAYBACK_TOGGLE"
    }
}
