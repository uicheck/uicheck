package ai.uicheck.android

import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class UiCheckAndroidClientTest {
  @Test
  fun inspectElementsRealNativeDemo() {
    val demo = createAndroidDemo()
    val client = UiCheckAndroidClient(
      UiCheckAndroidOptions(
        rootView = { demo.root },
        screenshot = createAndroidViewScreenshotProvider(demo.root)
      )
    )

    val result = client.inspectElements()
    assertEquals("android-native", result["platform"])
    assertEquals(6, result["count"])

    val elements = flattenTree(result["tree"] as List<*>)
    val element = elements.last() as Map<*, *>
    assertEquals("Button", element["tag"])
    assertEquals("Submit order", element["text"])
  }

  @Test
  fun handleMcpRequestForTestingReturnsResponse() {
    val context = RuntimeEnvironment.getApplication()
    val title = TextView(context).apply {
      text = "Welcome"
      layout(8, 16, 168, 48)
    }
    val client = UiCheckAndroidClient(UiCheckAndroidOptions(rootView = { title }))
    val response = client.handleRequestForTesting(
      """{"type":"request","id":"req-1","method":"inspect_elements","params":{}}"""
    )

    assertNotNull(response)
    val json = JSONObject(response!!)
    assertEquals("response", json.getString("type"))
    assertEquals("req-1", json.getString("id"))
    assertEquals(1, json.getJSONObject("result").getInt("count"))
  }

  private fun createAndroidDemo(): AndroidDemo {
    val context = RuntimeEnvironment.getApplication()
    val root = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.rgb(247, 249, 252))
      setPadding(24, 24, 24, 24)
      layoutParams = ViewGroup.LayoutParams(393, 640)
      contentDescription = "Android checkout screen"
    }
    val title = TextView(context).apply {
      text = "Android checkout"
      textSize = 22f
      setTextColor(Color.rgb(17, 24, 39))
    }
    val summary = TextView(context).apply {
      text = "Registered ref summary"
      setBackgroundColor(Color.WHITE)
      setPadding(16, 16, 16, 16)
      setTextColor(Color.rgb(71, 85, 105))
    }
    val status = TextView(context).apply {
      text = "Ready for MCP inspection"
      setBackgroundColor(Color.WHITE)
      setPadding(16, 16, 16, 16)
      setTextColor(Color.rgb(71, 85, 105))
    }
    val submit = Button(context).apply {
      text = "Submit order"
      contentDescription = "Submit order"
      setBackgroundColor(Color.rgb(37, 99, 235))
      setTextColor(Color.WHITE)
    }

    root.addView(title, LinearLayout.LayoutParams(345, 34))
    root.addView(summary, LinearLayout.LayoutParams(345, 126).apply { topMargin = 16 })
    root.addView(status, LinearLayout.LayoutParams(345, 104).apply { topMargin = 16 })
    root.addView(View(context), LinearLayout.LayoutParams(345, 16, 1f))
    root.addView(submit, LinearLayout.LayoutParams(345, 54))
    root.measure(View.MeasureSpec.makeMeasureSpec(393, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(640, View.MeasureSpec.EXACTLY))
    root.layout(0, 0, 393, 640)
    return AndroidDemo(root, title, summary, status, submit)
  }

  private data class AndroidDemo(val root: LinearLayout, val title: TextView, val summary: TextView, val status: TextView, val submit: Button)

  private fun flattenTree(nodes: List<*>): List<Any?> =
    nodes.flatMap { node ->
      val map = node as Map<*, *>
      listOf(node) + flattenTree(map["children"] as? List<*> ?: emptyList<Any>())
    }

}
