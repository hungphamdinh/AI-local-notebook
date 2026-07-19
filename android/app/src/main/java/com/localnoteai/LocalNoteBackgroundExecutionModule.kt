package com.localnoteai

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocalNoteBackgroundExecutionModule(private val context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
  override fun getName() = "LocalNoteBackgroundExecution"

  @ReactMethod
  fun start(label: String, promise: Promise) {
    try {
      val intent = Intent(context, LocalNoteGenerationService::class.java).putExtra(LocalNoteGenerationService.EXTRA_LABEL, label)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("background_start_failure", error.message, error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    context.stopService(Intent(context, LocalNoteGenerationService::class.java))
    promise.resolve(null)
  }
}
