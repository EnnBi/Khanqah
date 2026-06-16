package com.khanqah.shaykh

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class ShaykhFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // Topics are managed client-side; no token upload needed.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: "نیا سوال"
        val body = message.notification?.body ?: "آپ کے پاس ایک نیا سوال ہے۔"

        val mgr = getSystemService(NotificationManager::class.java)
        if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
            mgr.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "سوالات", NotificationManager.IMPORTANCE_HIGH)
            )
        }

        val tap = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pi = PendingIntent.getActivity(
            this, 0, tap,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notif_broadcast)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()

        mgr.notify(System.currentTimeMillis().toInt(), notif)
    }

    companion object {
        private const val CHANNEL_ID = "khanqah_shaykh"
    }
}
