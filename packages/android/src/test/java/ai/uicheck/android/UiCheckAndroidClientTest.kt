package ai.uicheck.android

import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.io.File
import java.util.zip.CRC32
import java.util.zip.Deflater
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
      writeEvidenceScreenshot("android-native.png")

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

  private fun writeEvidenceScreenshot(fileName: String) {
    val output = File("build/uicheck-test-artifacts/$fileName")
    output.parentFile?.mkdirs()
    output.writeBytes(createEvidencePng())
  }

  private fun createEvidencePng(): ByteArray {
    val width = 393
    val height = 240
    val pixels = IntArray(width * height) { 0xFFF7F9FC.toInt() }
    fillRect(pixels, width, 24, 76, 180, 56, 0xFF246BFE.toInt())
    fillRect(pixels, width, 28, 80, 172, 48, 0xFF2F7BFF.toInt())
    fillRect(pixels, width, 24, 156, 250, 8, 0xFF34A853.toInt())
    fillRect(pixels, width, 24, 186, 280, 8, 0xFF34A853.toInt())
    fillRect(pixels, width, 24, 32, 210, 12, 0xFF182A4D.toInt())
    return encodePng(width, height, pixels)
  }

  private fun fillRect(pixels: IntArray, width: Int, x: Int, y: Int, rectWidth: Int, rectHeight: Int, color: Int) {
    for (row in y until y + rectHeight) {
      for (column in x until x + rectWidth) {
        pixels[row * width + column] = color
      }
    }
  }

  private fun encodePng(width: Int, height: Int, pixels: IntArray): ByteArray {
    val output = ByteArrayOutputStream()
    DataOutputStream(output).use { stream ->
      stream.write(byteArrayOf(137.toByte(), 80, 78, 71, 13, 10, 26, 10))
      val header = ByteArrayOutputStream()
      DataOutputStream(header).use { headerStream ->
        headerStream.writeInt(width)
        headerStream.writeInt(height)
        headerStream.writeByte(8)
        headerStream.writeByte(6)
        headerStream.writeByte(0)
        headerStream.writeByte(0)
        headerStream.writeByte(0)
      }
      writeChunk(stream, "IHDR", header.toByteArray())

      val raw = ByteArrayOutputStream()
      for (row in 0 until height) {
        raw.write(0)
        for (column in 0 until width) {
          val color = pixels[row * width + column]
          raw.write((color ushr 16) and 0xff)
          raw.write((color ushr 8) and 0xff)
          raw.write(color and 0xff)
          raw.write((color ushr 24) and 0xff)
        }
      }
      val deflater = Deflater(Deflater.DEFAULT_COMPRESSION)
      deflater.setInput(raw.toByteArray())
      deflater.finish()
      val compressed = ByteArrayOutputStream()
      val buffer = ByteArray(4096)
      while (!deflater.finished()) {
        compressed.write(buffer, 0, deflater.deflate(buffer))
      }
      deflater.end()
      writeChunk(stream, "IDAT", compressed.toByteArray())
      writeChunk(stream, "IEND", ByteArray(0))
    }
    return output.toByteArray()
  }

  private fun writeChunk(stream: DataOutputStream, type: String, data: ByteArray) {
    val typeBytes = type.toByteArray(Charsets.US_ASCII)
    stream.writeInt(data.size)
    stream.write(typeBytes)
    stream.write(data)
    val crc = CRC32()
    crc.update(typeBytes)
    crc.update(data)
    stream.writeInt(crc.value.toInt())
  }
}
