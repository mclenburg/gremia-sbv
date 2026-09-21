package de.gremia.sbv.companion.data.mobile

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineNotificationPlan
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineNotificationPlanner
import de.gremia.sbv.companion.domain.mobile.MobileSnapshot
import java.time.Instant

class MobileDeadlineNotificationScheduler(
    private val context: Context,
    private val planner: MobileDeadlineNotificationPlanner = MobileDeadlineNotificationPlanner(),
) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun schedule(snapshot: MobileSnapshot, now: Instant = Instant.now()) {
        createChannel()
        cancelPreviouslyScheduled()
        val plans = planner.plansFor(snapshot, now)
        plans.forEach { plan -> schedule(plan) }
        preferences.edit()
            .putStringSet(SCHEDULED_NOTIFICATION_IDS_KEY, plans.map { plan -> plan.notificationId.toString() }.toSet())
            .apply()
    }

    fun cancelAll() {
        cancelPreviouslyScheduled()
        preferences.edit().remove(SCHEDULED_NOTIFICATION_IDS_KEY).apply()
        context.getSystemService(NotificationManager::class.java).cancelAll()
    }

    private fun schedule(plan: MobileDeadlineNotificationPlan) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        val triggerAtMillis = plan.triggerAt.toEpochMilli()
        val pendingIntent = pendingIntentFor(plan)
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }

    private fun cancelPreviouslyScheduled() {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        preferences.getStringSet(SCHEDULED_NOTIFICATION_IDS_KEY, emptySet()).orEmpty()
            .mapNotNull { value -> value.toIntOrNull() }
            .forEach { notificationId ->
                alarmManager.cancel(pendingIntentFor(notificationId))
            }
    }

    private fun pendingIntentFor(plan: MobileDeadlineNotificationPlan): PendingIntent {
        val intent = Intent(context, MobileDeadlineNotificationReceiver::class.java).apply {
            putExtra(MobileDeadlineNotificationReceiver.EXTRA_NOTIFICATION_ID, plan.notificationId)
            putExtra(MobileDeadlineNotificationReceiver.EXTRA_TITLE, plan.title)
            putExtra(MobileDeadlineNotificationReceiver.EXTRA_BODY, plan.body)
        }
        return pendingIntentFor(plan.notificationId, intent)
    }

    private fun pendingIntentFor(notificationId: Int): PendingIntent =
        pendingIntentFor(notificationId, Intent(context, MobileDeadlineNotificationReceiver::class.java))

    private fun pendingIntentFor(notificationId: Int, intent: Intent): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Gremia.SBV Fristen",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Datensparsame Hinweise auf mobile Gremia.SBV-Fristen."
            lockscreenVisibility = Notification.VISIBILITY_SECRET
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "gremia_sbv_companion_deadlines"

        private const val PREFERENCES_NAME = "gremia_sbv_companion_deadline_notifications"
        private const val SCHEDULED_NOTIFICATION_IDS_KEY = "scheduled_notification_ids_v1"
    }
}
