package com.mahimediasolutions.supportcenter.nativeapp.ui

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.mahimediasolutions.supportcenter.nativeapp.R

/** Foreground, operator-triggered local notification; NOT a Firebase/remote push service. */
internal object LocalAlerts {
    const val permission = Manifest.permission.POST_NOTIFICATIONS
    private const val channelId = "supportcenter_native_attention_v1"

    fun needsPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED

    fun notifyNow(context: Context, title: String, body: String): Boolean {
        if (needsPermission(context)) return false
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(NotificationChannel(
                channelId, "SupportCenter attention", NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Manual native app attention notifications" })
        }
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title.take(100))
            .setContentText(body.take(200))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body.take(500)))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        return try {
            NotificationManagerCompat.from(context).notify(3003, notification)
            true
        } catch (_: SecurityException) { false }
    }
}
