package ai.uicheck.demo

import ai.uicheck.android.UiCheckAndroidClient
import ai.uicheck.android.UiCheckAndroidOptions
import android.view.View
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class UICheckAndroidDemoEvidenceTest {
  @Test
  fun inspectsRealExampleDemoWithUiCheck() {
    val app = RuntimeEnvironment.getApplication()
    app.resources.displayMetrics.density = 1f
    app.resources.displayMetrics.scaledDensity = 1f
    app.resources.displayMetrics.densityDpi = 160
    val demo = createUICheckAndroidDemoView(app)
    demo.screen.measure(View.MeasureSpec.makeMeasureSpec(393, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(844, View.MeasureSpec.EXACTLY))
    demo.screen.layout(0, 0, 393, 844)

    val client = UiCheckAndroidClient(
      UiCheckAndroidOptions(
        rootView = { demo.screen }
      )
    )
    val inspected = client.inspectElements(mapOf("limit" to 500))
    assertEquals("android-native", inspected["platform"])
    assertTrue((inspected["count"] as Int) >= 5)
    val inspectedJson = JSONObject(inspected).toString(2)
    assertTrue(inspectedJson.contains("Runtime check 34"))
    assertTrue(inspectedJson.contains("Submit order"))
    writeTextArtifact("android-demo-inspect-elements.snapshot.json", inspectedJson)
  }

  private fun writeTextArtifact(fileName: String, value: String) {
    val output = File("build/uicheck-test-artifacts/$fileName")
    output.parentFile?.mkdirs()
    output.writeText(value + "\n")
  }
}
