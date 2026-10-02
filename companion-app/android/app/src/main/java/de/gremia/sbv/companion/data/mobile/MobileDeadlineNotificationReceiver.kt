package de.gremia.sbv.companion.data.mobile

import android.Manifest
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat

class MobileDeadlineNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!context.canPostNotifications()) return
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0)
        if (notificationId == 0) return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Gremia.SBV"
        val body = intent.getStringExtra(EXTRA_BODY) ?: "Eine Frist erfordert Aufmerksamkeit."
        val notification = NotificationCompat.Builder(context, MobileDeadlineNotificationScheduler.CHANNEL_ID)
            .setSmallIcon(de.gremia.sbv.companion.R.drawable.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        context.getSystemService(NotificationManager::class.java).notify(notificationId, notification)
    }

    private fun Context.canPostNotifications(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    companion object {
        const val EXTRA_NOTIFICATION_ID = "de.gremia.sbv.companion.extra.NOTIFICATION_ID"
        const val EXTRA_TITLE = "de.gremia.sbv.companion.extra.TITLE"
        const val EXTRA_BODY = "de.gremia.sbv.companion.extra.BODY"
    }
}
