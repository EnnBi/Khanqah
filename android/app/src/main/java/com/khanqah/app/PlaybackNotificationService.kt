package com.khanqah.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.media3.common.Player

class PlaybackNotificationService : Service() {

    private val manager by lazy { getSystemService(NotificationManager::class.java) }

    private val playerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            val info = (application as KhanqahApp).nowPlayingManager.info.value ?: return
            manager.notify(NOTIF_ID, buildNotification(info.title, info.type, isPlaying))
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val app = application as KhanqahApp
        val info = app.nowPlayingManager.info.value
        val player = app.nowPlayingManager.player

        val title = info?.title ?: intent?.getStringExtra(EXTRA_TITLE) ?: "Now Playing"
        val type  = info?.type  ?: intent?.getStringExtra(EXTRA_TYPE)  ?: ""
        val isPlaying = player?.isPlaying ?: true

        startForeground(NOTIF_ID, buildNotification(title, type, isPlaying))

        player?.addListener(playerListener)

        return START_STICKY
    }

    override fun onDestroy() {
        (application as KhanqahApp).nowPlayingManager.player?.removeListener(playerListener)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(title: String, type: String, isPlaying: Boolean): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                action = ACTION_OPEN_PLAYER
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val toggleIntent = PendingIntent.getBroadcast(
            this, 0,
            Intent(PlaybackControlReceiver.ACTION_TOGGLE),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val playPauseIcon = if (isPlaying) R.drawable.ic_notif_pause else R.drawable.ic_notif_play
        val playPauseLabel = if (isPlaying) "Pause" else "Play"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif_listening)
            .setContentTitle(title)
            .setContentText(type.replaceFirstChar { it.uppercase() })
            .setContentIntent(openIntent)
            .addAction(playPauseIcon, playPauseLabel, toggleIntent)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setSilent(true)
            .build()
    }

    companion object {
        const val CHANNEL_ID   = "playback_channel"
        const val NOTIF_ID     = 2
        const val EXTRA_TITLE  = "extra_title"
        const val EXTRA_TYPE   = "extra_type"
        const val ACTION_OPEN_PLAYER = "com.khanqah.app.OPEN_PLAYER"

        fun createChannel(context: android.content.Context) {
            val ch = NotificationChannel(
                CHANNEL_ID,
                "Now Playing",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "Media playback controls" }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
    }
}
