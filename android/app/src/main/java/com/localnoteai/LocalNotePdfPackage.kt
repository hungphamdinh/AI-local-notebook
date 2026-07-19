package com.localnoteai
import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
class LocalNotePdfPackage:ReactPackage{
  override fun createNativeModules(context:ReactApplicationContext)=listOf<NativeModule>(LocalNotePdfModule(context),LocalNoteBackgroundExecutionModule(context))
  override fun createViewManagers(context:ReactApplicationContext)=emptyList<ViewManager<*,*>>()
}
