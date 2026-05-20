package ai.uicheck.demo

import ai.uicheck.android.UiCheckAndroidClient
import ai.uicheck.android.UiCheckAndroidOptions
import ai.uicheck.android.UiCheckAndroidSocketOptions
import ai.uicheck.android.initUiCheck
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View

class MainActivity : Activity() {
  private var client: UiCheckAndroidClient? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.statusBarColor = Color.rgb(17, 24, 39)
    window.navigationBarColor = Color.rgb(248, 250, 252)
    window.decorView.systemUiVisibility =
      View.SYSTEM_UI_FLAG_FULLSCREEN or
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    val demo = createUICheckAndroidDemoView(this)
    setContentView(demo.screen)

    val socketUrl = System.getenv("UICHECK_SOCKET_URL")
    if (!socketUrl.isNullOrBlank()) {
      client = initUiCheck(
        UiCheckAndroidOptions(
          socket = UiCheckAndroidSocketOptions(
            url = socketUrl,
            clientId = "android-demo",
            reconnectMs = 500
          ),
          activity = this
        )
      )
    }
  }

  override fun onDestroy() {
    client?.close()
    super.onDestroy()
  }

}
