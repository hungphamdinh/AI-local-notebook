package com.localnoteai

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

class LocalNoteGenerationService: Service() {
  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Local AI generation", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shows when private on-device AI work continues in the background."
          setShowBadge(false)
        },
      )
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val label = intent?.getStringExtra(EXTRA_LABEL) ?: "Generating with local AI"
    val openApp = PendingIntent.getActivity(
      this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
    val notification = builder
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("LocalNote AI is working")
      .setContentText(label)
      .setContentIntent(openApp)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_PROGRESS)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    const val EXTRA_LABEL = "generation_label"
    private const val CHANNEL_ID = "local_ai_generation"
    private const val NOTIFICATION_ID = 4107
  }
}
