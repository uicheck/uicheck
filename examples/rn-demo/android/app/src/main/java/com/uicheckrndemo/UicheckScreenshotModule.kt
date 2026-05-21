package com.uicheckrndemo

import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableNativeMap
import java.io.ByteArrayOutputStream

class UicheckScreenshotModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UicheckScreenshot"

  @ReactMethod
  fun capture(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val activity = reactContext.currentActivity ?: throw IllegalStateException("No current activity")
        val view = activity.window.decorView.rootView
        val width = view.width
        val height = view.height
        if (width <= 0 || height <= 0) throw IllegalStateException("Root view is not laid out")

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        view.draw(canvas)

        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
        bitmap.recycle()

        val result = WritableNativeMap()
        result.putString("base64", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP))
        result.putInt("width", width)
        result.putInt("height", height)
        promise.resolve(result)
      } catch (error: Throwable) {
        promise.reject("UICHECK_SCREENSHOT_FAILED", error)
      }
    }
  }
}
