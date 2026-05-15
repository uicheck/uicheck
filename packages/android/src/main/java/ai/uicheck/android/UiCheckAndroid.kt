package ai.uicheck.android

import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.view.View
import android.widget.TextView
import java.io.ByteArrayOutputStream
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.math.roundToInt
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject

data class UiCheckAndroidSocketOptions(
  val url: String? = null,
  val clientId: String? = null,
  val reconnectMs: Long = 1000,
  val enabled: Boolean = true
)

data class UiCheckAndroidViewportInfo(
  val width: Int = 0,
  val height: Int = 0,
  val devicePixelRatio: Double = 1.0,
  val scrollX: Int = 0,
  val scrollY: Int = 0
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "width" to width,
    "height" to height,
    "devicePixelRatio" to devicePixelRatio,
    "scrollX" to scrollX,
    "scrollY" to scrollY
  )
}

data class UiCheckAndroidRect(
  val x: Double,
  val y: Double,
  val width: Double,
  val height: Double
)

data class UiCheckAndroidScreenshotResult(
  val url: String? = null,
  val title: String? = null,
  val width: Int? = null,
  val height: Int? = null,
  val mimeType: String = "image/png",
  val base64: String
) {
  fun toMap(): Map<String, Any?> = compactMap(
    "url" to url,
    "title" to title,
    "width" to width,
    "height" to height,
    "mimeType" to mimeType,
    "base64" to base64
  )
}

data class UiCheckAndroidOptions(
  val socket: UiCheckAndroidSocketOptions? = null,
  val title: String? = null,
  val route: String? = null,
  val platform: String? = null,
  val viewport: () -> UiCheckAndroidViewportInfo = { UiCheckAndroidViewportInfo() },
  val screenshot: ((Map<String, Any?>) -> UiCheckAndroidScreenshotResult)? = null
)

data class UiCheckAndroidElementRegistration(
  val id: String? = null,
  val tag: String? = null,
  val selector: String? = null,
  val testID: String? = null,
  val text: String? = null,
  val accessibilityLabel: String? = null,
  val className: String? = null,
  val visible: Boolean = true,
  val dataset: Map<String, String>? = null,
  val frame: () -> UiCheckAndroidRect?
)

data class UiCheckAndroidElementInfo(
  val tag: String,
  val selector: String,
  val id: String?,
  val testID: String?,
  val accessibilityLabel: String?,
  val classes: List<String>,
  val text: String?,
  val visible: Boolean,
  val box: Map<String, Int>,
  val dataset: Map<String, String>?
) {
  fun toMap(): Map<String, Any?> = compactMap(
    "tag" to tag,
    "selector" to selector,
    "id" to id,
    "testID" to testID,
    "accessibilityLabel" to accessibilityLabel,
    "classes" to classes,
    "text" to text,
    "visible" to visible,
    "box" to box,
    "dataset" to dataset
  )
}

private data class RegisteredAndroidElement(
  val uid: String,
  val registration: UiCheckAndroidElementRegistration
)

class UiCheckAndroidClient(
  private val options: UiCheckAndroidOptions = UiCheckAndroidOptions(),
  private val httpClient: OkHttpClient = OkHttpClient()
) {
  private var webSocket: WebSocket? = null
  @Volatile private var closed = false

  fun connect() {
    val socket = options.socket ?: return
    val rawUrl = socket.url
    if (!socket.enabled || rawUrl.isNullOrBlank()) return

    closed = false
    webSocket?.close(1000, "reconnect")
    val request = Request.Builder().url(appendClientId(rawUrl, socket.clientId)).build()
    webSocket = httpClient.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(webSocket: WebSocket, response: Response) {
        sendClientInfo("hello")
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        handleRequest(text)?.let { webSocket.send(it) }
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        scheduleReconnect()
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        if (!closed) scheduleReconnect()
      }
    })
  }

  fun close() {
    closed = true
    webSocket?.close(1000, "closed")
    webSocket = null
  }

  fun clientInfo(): Map<String, Any?> = compactMap(
    "url" to options.route,
    "title" to options.title,
    "userAgent" to (options.platform ?: "android-native"),
    "viewport" to options.viewport().toMap()
  )

  fun inspectElements(params: Map<String, Any?> = emptyMap()): Map<String, Any?> {
    val selector = params["selector"] as? String ?: "*"
    val includeHidden = params["includeHidden"] == true
    val limit = clampLimit(params["limit"])
    val elements = registeredElements
      .asSequence()
      .filter { matchesSelector(it, selector) }
      .mapNotNull { normalizeElement(it) }
      .filter { includeHidden || it.visible }
      .take(limit)
      .map { it.toMap() }
      .toList()

    return compactMap(
      "platform" to "android-native",
      "os" to options.platform,
      "url" to options.route,
      "title" to options.title,
      "viewport" to options.viewport().toMap(),
      "count" to elements.size,
      "elements" to elements
    )
  }

  fun getElementAtPoint(params: Map<String, Any?> = emptyMap()): Map<String, Any?> {
    val x = numberValue(params["x"]) ?: 0.0
    val y = numberValue(params["y"]) ?: 0.0
    val result = inspectElements(
      mapOf(
        "selector" to (params["selector"] ?: "*"),
        "includeHidden" to false,
        "limit" to 500
      )
    )
    val elements = (result["elements"] as? List<*>)?.filterIsInstance<Map<String, Any?>>() ?: emptyList()
    val element = elements
      .filter { containsPoint(it, x, y) }
      .minByOrNull { boxArea(it) }

    return compactMap(
      "platform" to "android-native",
      "os" to options.platform,
      "url" to options.route,
      "title" to options.title,
      "viewport" to result["viewport"],
      "point" to mapOf("x" to x, "y" to y),
      "element" to element,
      "ancestors" to emptyList<Any>()
    )
  }

  fun capturePage(params: Map<String, Any?> = emptyMap()): UiCheckAndroidScreenshotResult {
    val screenshot = options.screenshot ?: throw UiCheckAndroidException("capture_page requires an Android screenshot provider")
    return screenshot(params)
  }

  fun handleRequestForTesting(raw: String): String? = handleRequest(raw)

  private fun handleRequest(raw: String): String? {
    val message = runCatching { JSONObject(raw) }.getOrNull() ?: return null
    if (message.optString("type") != "request") return null
    val id = message.optString("id", "")
    if (id.isBlank()) return null

    return try {
      val params = message.optJSONObject("params")?.toPlainMap() ?: emptyMap()
      val result = when (val method = message.optString("method")) {
        "capture_page" -> capturePage(params).toMap()
        "inspect_elements" -> inspectElements(params)
        "get_element_at_point" -> getElementAtPoint(params)
        else -> throw UiCheckAndroidException("Unknown uicheck method: $method")
      }
      stringify(mapOf("type" to "response", "id" to id, "result" to result))
    } catch (error: Throwable) {
      stringify(mapOf("type" to "response", "id" to id, "error" to (error.message ?: error.toString())))
    }
  }

  private fun sendClientInfo(type: String) {
    webSocket?.send(stringify(clientInfo() + mapOf("type" to type)))
  }

  private fun scheduleReconnect() {
    if (closed) return
    val socket = options.socket ?: return
    Thread {
      try {
        Thread.sleep(socket.reconnectMs)
      } catch (_: InterruptedException) {
        return@Thread
      }
      if (!closed) connect()
    }.start()
  }

  companion object {
    private val registeredElements = CopyOnWriteArrayList<RegisteredAndroidElement>()

    fun registerElement(registration: UiCheckAndroidElementRegistration): () -> Unit {
      val item = RegisteredAndroidElement(UUID.randomUUID().toString(), registration)
      registeredElements.add(item)
      return { registeredElements.remove(item) }
    }
  }
}

class UiCheckAndroidException(message: String) : RuntimeException(message)

fun installAndroidUiCheck(options: UiCheckAndroidOptions = UiCheckAndroidOptions()): UiCheckAndroidClient {
  val client = UiCheckAndroidClient(options)
  client.connect()
  return client
}

fun registerAndroidUiCheckElement(registration: UiCheckAndroidElementRegistration): () -> Unit =
  UiCheckAndroidClient.registerElement(registration)

fun registerAndroidUiCheckView(
  view: View,
  id: String? = null,
  tag: String? = null,
  selector: String? = null,
  testID: String? = null,
  text: String? = null,
  accessibilityLabel: String? = null,
  className: String? = null,
  visible: Boolean = true,
  dataset: Map<String, String>? = null
): () -> Unit {
  return registerAndroidUiCheckElement(
    UiCheckAndroidElementRegistration(
      id = id,
      tag = tag ?: view.javaClass.simpleName,
      selector = selector,
      testID = testID ?: resourceEntryName(view),
      text = text ?: (view as? TextView)?.text?.toString(),
      accessibilityLabel = accessibilityLabel ?: view.contentDescription?.toString(),
      className = className,
      visible = visible,
      dataset = dataset,
      frame = { viewFrame(view) }
    )
  )
}

fun createAndroidViewScreenshotProvider(root: View): (Map<String, Any?>) -> UiCheckAndroidScreenshotResult {
  return {
    val bitmap = Bitmap.createBitmap(root.width, root.height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    root.draw(canvas)
    val output = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
    UiCheckAndroidScreenshotResult(
      width = root.width,
      height = root.height,
      mimeType = "image/png",
      base64 = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    )
  }
}

private fun normalizeElement(item: RegisteredAndroidElement): UiCheckAndroidElementInfo? {
  val frame = item.registration.frame() ?: return null
  val width = frame.width.roundToInt()
  val height = frame.height.roundToInt()
  val x = frame.x.roundToInt()
  val y = frame.y.roundToInt()
  val visible = item.registration.visible && width > 0 && height > 0

  return UiCheckAndroidElementInfo(
    tag = item.registration.tag ?: "NativeView",
    selector = createSelector(item),
    id = item.registration.id,
    testID = item.registration.testID,
    accessibilityLabel = item.registration.accessibilityLabel,
    classes = classes(item.registration.className),
    text = compactText(item.registration.text ?: item.registration.accessibilityLabel),
    visible = visible,
    box = mapOf(
      "x" to x,
      "y" to y,
      "width" to width,
      "height" to height,
      "top" to y,
      "left" to x
    ),
    dataset = item.registration.dataset
  )
}

private fun createSelector(item: RegisteredAndroidElement): String {
  val registration = item.registration
  if (!registration.selector.isNullOrBlank()) return registration.selector
  if (!registration.id.isNullOrBlank()) return "#${registration.id}"
  if (!registration.testID.isNullOrBlank()) return "[testID=\"${registration.testID}\"]"
  if (!registration.accessibilityLabel.isNullOrBlank()) {
    return "[accessibilityLabel=\"${registration.accessibilityLabel}\"]"
  }
  return "${registration.tag ?: "NativeView"}:registered(${item.uid})"
}

private fun matchesSelector(item: RegisteredAndroidElement, selector: String): Boolean {
  if (selector.isBlank() || selector == "*") return true
  val registration = item.registration
  return selector == registration.selector ||
    selector == registration.tag ||
    selector == "#${registration.id}" ||
    selector == "[testID=\"${registration.testID}\"]" ||
    selector == "[accessibilityLabel=\"${registration.accessibilityLabel}\"]" ||
    classes(registration.className).any { selector == ".$it" }
}

private fun viewFrame(view: View): UiCheckAndroidRect? {
  if (view.width <= 0 || view.height <= 0) return null
  val location = IntArray(2)
  view.getLocationOnScreen(location)
  return UiCheckAndroidRect(
    x = location[0].toDouble(),
    y = location[1].toDouble(),
    width = view.width.toDouble(),
    height = view.height.toDouble()
  )
}

private fun resourceEntryName(view: View): String? {
  if (view.id == View.NO_ID) return null
  return runCatching { view.resources.getResourceEntryName(view.id) }.getOrNull()
}

private fun compactMap(vararg pairs: Pair<String, Any?>): Map<String, Any?> =
  pairs.filter { it.second != null }.toMap()

private fun compactText(value: String?): String? {
  val text = value?.trim() ?: return null
  return text.ifEmpty { null }?.take(200)
}

private fun classes(value: String?): List<String> =
  value?.split(Regex("\\s+"))?.filter { it.isNotBlank() } ?: emptyList()

private fun clampLimit(value: Any?): Int {
  val limit = when (value) {
    is Number -> value.toInt()
    is String -> value.toIntOrNull()
    else -> null
  } ?: 200
  return limit.coerceIn(1, 1000)
}

private fun numberValue(value: Any?): Double? = when (value) {
  is Number -> value.toDouble()
  is String -> value.toDoubleOrNull()
  else -> null
}

private fun containsPoint(element: Map<String, Any?>, x: Double, y: Double): Boolean {
  val box = element["box"] as? Map<*, *> ?: return false
  val left = numberValue(box["left"]) ?: numberValue(box["x"]) ?: return false
  val top = numberValue(box["top"]) ?: numberValue(box["y"]) ?: return false
  val width = numberValue(box["width"]) ?: return false
  val height = numberValue(box["height"]) ?: return false
  return x >= left && x <= left + width && y >= top && y <= top + height
}

private fun boxArea(element: Map<String, Any?>): Double {
  val box = element["box"] as? Map<*, *> ?: return Double.POSITIVE_INFINITY
  val width = numberValue(box["width"]) ?: return Double.POSITIVE_INFINITY
  val height = numberValue(box["height"]) ?: return Double.POSITIVE_INFINITY
  return width * height
}

private fun appendClientId(rawUrl: String, clientId: String?): String {
  if (clientId.isNullOrBlank()) return rawUrl
  val separator = if (rawUrl.contains("?")) "&" else "?"
  val encoded = URLEncoder.encode(clientId, StandardCharsets.UTF_8.name())
  return "${rawUrl}${separator}clientId=${encoded}"
}

private fun JSONObject.toPlainMap(): Map<String, Any?> {
  val output = mutableMapOf<String, Any?>()
  keys().forEach { key ->
    output[key] = normalizeJsonValue(get(key))
  }
  return output
}

private fun JSONArray.toListValue(): List<Any?> {
  val output = mutableListOf<Any?>()
  for (index in 0 until length()) {
    output.add(normalizeJsonValue(get(index)))
  }
  return output
}

private fun normalizeJsonValue(value: Any?): Any? = when (value) {
  JSONObject.NULL -> null
  is JSONObject -> value.toPlainMap()
  is JSONArray -> value.toListValue()
  else -> value
}

private fun stringify(value: Any?): String = toJsonValue(value).toString()

private fun toJsonValue(value: Any?): Any? = when (value) {
  null -> JSONObject.NULL
  is Map<*, *> -> JSONObject().also { json ->
    value.forEach { (key, item) ->
      if (key != null && item != null) json.put(key.toString(), toJsonValue(item))
    }
  }
  is Iterable<*> -> JSONArray().also { array ->
    value.forEach { array.put(toJsonValue(it)) }
  }
  is Array<*> -> JSONArray().also { array ->
    value.forEach { array.put(toJsonValue(it)) }
  }
  else -> value
}
