package com.khanqah.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat

class ListeningForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Live Session"

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            action = ACTION_OPEN_LIVE
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🔴  LIVE")
            .setContentText(title)
            .setSmallIcon(R.drawable.ic_notif_listening)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()

        startForeground(NOTIF_ID, notification)
        return START_NOT_STICKY
    }

    companion object {
        const val CHANNEL_ID      = "listening_live"
        const val NOTIF_ID        = 3001
        const val EXTRA_TITLE     = "title"
        const val ACTION_OPEN_LIVE = "com.khanqah.app.OPEN_LIVE"

        fun createChannel(ctx: android.content.Context) {
            val mgr = ctx.getSystemService(NotificationManager::class.java)
            if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
            mgr.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Live Listening", NotificationManager.IMPORTANCE_LOW)
                    .apply { description = "Shown while listening to a live broadcast" },
            )
        }
    }
}
