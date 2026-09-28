package de.gremia.sbv.companion.data.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class MobileDeadlineRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val pending = goAsync()
        val appContext = context.applicationContext
        Thread {
            try {
                MobileSnapshotRepository(appContext).current()?.let { snapshot ->
                    MobileDeadlineNotificationScheduler(appContext).schedule(snapshot)
                }
            } catch (_: Exception) {
                Log.e("Gremia.SBV", "MOBILE_REMINDER_RESTORE_FAILED")
            } finally {
                pending.finish()
            }
        }.start()
    }
}
