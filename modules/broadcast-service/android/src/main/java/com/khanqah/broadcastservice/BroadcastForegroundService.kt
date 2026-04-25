package com.khanqah.broadcastservice

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class BroadcastForegroundService : Service() {
  companion object {
    const val CHANNEL_ID = "khanqah_broadcast"
    const val NOTIFICATION_ID = 4711
  }

  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      nm?.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          "Live broadcast",
          NotificationManager.IMPORTANCE_LOW,
        ).apply { description = "Shown while broadcasting live audio" },
      )
    }
    // Tap-target: deep-link back to the go-live screen via expo-router's
    // khanqah:// scheme. SINGLE_TOP keeps an existing instance from being
    // recreated; CLEAR_TOP collapses the stack down to that screen.
    val deepLink = Intent(
      Intent.ACTION_VIEW,
      Uri.parse("khanqah://admin/go-live"),
    ).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_SINGLE_TOP or
        Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      deepLink,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Broadcasting live")
      .setContentText("Tap to return to broadcast")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(contentIntent)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "khanqah:broadcast").apply { acquire() }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onDestroy() {
    try { wakeLock?.release() } catch (_: Throwable) {}
    wakeLock = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
