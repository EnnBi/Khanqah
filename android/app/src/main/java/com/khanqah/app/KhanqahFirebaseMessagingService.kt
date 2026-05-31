package com.khanqah.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class KhanqahFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // Topics are managed client-side; no token upload needed.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: return
        val body  = message.notification?.body  ?: ""
        showNotification(title, body)
    }

    private fun showNotification(title: String, body: String) {
        val mgr = getSystemService(NotificationManager::class.java)
        ensureChannel(mgr)

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pi = PendingIntent.getActivity(this, 0, tapIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notif_audio)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()

        mgr.notify(System.currentTimeMillis().toInt(), notif)
    }

    private fun ensureChannel(mgr: NotificationManager) {
        if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
        mgr.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Khanqah Updates", NotificationManager.IMPORTANCE_DEFAULT)
                .apply { description = "Live session and new content alerts" }
        )
    }

    companion object {
        private const val CHANNEL_ID = "khanqah_updates"
    }
}
