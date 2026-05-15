package ai.uicheck.android

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class UiCheckAndroidClientTest {
  @Test
  fun inspectElementsReturnsRegisteredNativeElements() {
    val unregister = registerAndroidUiCheckElement(
      UiCheckAndroidElementRegistration(
        tag = "Button",
        testID = "submit-button",
        text = "Submit",
        frame = { UiCheckAndroidRect(12.0, 24.0, 120.0, 48.0) }
      )
    )

    try {
      val client = UiCheckAndroidClient(
        UiCheckAndroidOptions(
          title = "Demo",
          route = "/home",
          platform = "android",
          viewport = { UiCheckAndroidViewportInfo(width = 393, height = 873, devicePixelRatio = 2.75) }
        )
      )

      val result = client.inspectElements(mapOf("selector" to "[testID=\"submit-button\"]"))
      assertEquals("android-native", result["platform"])
      assertEquals(1, result["count"])

      val elements = result["elements"] as List<*>
      val element = elements.first() as Map<*, *>
      assertEquals("Button", element["tag"])
      assertEquals("Submit", element["text"])
      assertEquals("[testID=\"submit-button\"]", element["selector"])
    } finally {
      unregister()
    }
  }

  @Test
  fun getElementAtPointReturnsSmallestElement() {
    val unregisterContainer = registerAndroidUiCheckElement(
      UiCheckAndroidElementRegistration(
        tag = "FrameLayout",
        testID = "container",
        frame = { UiCheckAndroidRect(0.0, 0.0, 300.0, 300.0) }
      )
    )
    val unregisterButton = registerAndroidUiCheckElement(
      UiCheckAndroidElementRegistration(
        tag = "Button",
        testID = "submit-button",
        frame = { UiCheckAndroidRect(40.0, 60.0, 80.0, 40.0) }
      )
    )

    try {
      val client = UiCheckAndroidClient()
      val result = client.getElementAtPoint(mapOf("x" to 50, "y" to 70))
      val element = result["element"] as Map<*, *>
      assertEquals("Button", element["tag"])
      assertEquals("[testID=\"submit-button\"]", element["selector"])
    } finally {
      unregisterContainer()
      unregisterButton()
    }
  }

  @Test
  fun handleMcpRequestForTestingReturnsResponse() {
    val unregister = registerAndroidUiCheckElement(
      UiCheckAndroidElementRegistration(
        tag = "TextView",
        testID = "title",
        text = "Welcome",
        frame = { UiCheckAndroidRect(8.0, 16.0, 160.0, 32.0) }
      )
    )

    try {
      val client = UiCheckAndroidClient()
      val response = client.handleRequestForTesting(
        """{"type":"request","id":"req-1","method":"inspect_elements","params":{"selector":"[testID=\"title\"]"}}"""
      )

      assertNotNull(response)
      val json = JSONObject(response!!)
      assertEquals("response", json.getString("type"))
      assertEquals("req-1", json.getString("id"))
      assertEquals(1, json.getJSONObject("result").getInt("count"))
    } finally {
      unregister()
    }
  }
}
