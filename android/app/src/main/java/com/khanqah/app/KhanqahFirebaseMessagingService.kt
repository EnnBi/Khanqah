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

        val isQaPush = message.from?.startsWith("/topics/user-") == true ||
                       message.data["type"] == "qa"
        if (isQaPush) {
            val threadId = message.data["thread_id"]
            showAskNotification(title, body, threadId)
        } else {
            showNotification(title, body)
        }
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
            .setSmallIcon(R.drawable.ic_notif_listening)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()

        mgr.notify(System.currentTimeMillis().toInt(), notif)
    }

    private fun showAskNotification(title: String, body: String, threadId: String?) {
        val mgr = getSystemService(NotificationManager::class.java)
        ensureAskChannel(mgr)

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            action = ACTION_OPEN_ASK
            if (threadId != null) putExtra(EXTRA_THREAD_ID, threadId)
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val requestCode = threadId?.hashCode() ?: 0
        val pi = PendingIntent.getActivity(this, requestCode, tapIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        val notif = NotificationCompat.Builder(this, ASK_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notif_listening)
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

    private fun ensureAskChannel(mgr: NotificationManager) {
        if (mgr.getNotificationChannel(ASK_CHANNEL_ID) != null) return
        mgr.createNotificationChannel(
            NotificationChannel(ASK_CHANNEL_ID, "Ask Hazrat", NotificationManager.IMPORTANCE_HIGH)
                .apply { description = "Responses to your questions" }
        )
    }

    companion object {
        private const val CHANNEL_ID = "khanqah_updates"
        private const val ASK_CHANNEL_ID = "khanqah_ask"
        const val ACTION_OPEN_ASK = "com.khanqah.app.OPEN_ASK"
        const val EXTRA_THREAD_ID = "ask_thread_id"
    }
}
