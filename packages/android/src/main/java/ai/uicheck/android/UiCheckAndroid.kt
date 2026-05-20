package ai.uicheck.android

import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import java.io.ByteArrayOutputStream
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
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

private data class UiCheckAndroidViewportInfo(
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
  val width: Int? = null,
  val height: Int? = null,
  val mimeType: String = "image/png",
  val base64: String
) {
  fun toMap(): Map<String, Any?> = compactMap(
    "width" to width,
    "height" to height,
    "mimeType" to mimeType,
    "base64" to base64
  )
}

data class UiCheckAndroidOptions(
  val socket: UiCheckAndroidSocketOptions? = null,
  val rootView: (() -> View?)? = null,
  val screenshot: ((Map<String, Any?>) -> UiCheckAndroidScreenshotResult)? = null
)

data class UiCheckAndroidElementInfo(
  val tag: String,
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
    "userAgent" to "android-native",
    "viewport" to viewportInfo(options.rootView?.invoke()).toMap()
  )

  fun inspectElements(params: Map<String, Any?> = emptyMap()): Map<String, Any?> {
    val includeHidden = params["includeHidden"] == true
    val limit = clampLimit(params["limit"])
    val root = options.rootView?.invoke()
    val elements = collectElements(root)
      .asSequence()
      .filter { includeHidden || it.visible }
      .take(limit)
      .map { it.toMap() }
      .toList()

    return compactMap(
      "platform" to "android-native",
      "viewport" to viewportInfo(root).toMap(),
      "count" to elements.size,
      "tree" to createElementTree(elements)
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
}

class UiCheckAndroidException(message: String) : RuntimeException(message)

fun initUiCheck(options: UiCheckAndroidOptions = UiCheckAndroidOptions()): UiCheckAndroidClient {
  val client = UiCheckAndroidClient(options)
  client.connect()
  return client
}

fun createAndroidViewScreenshotProvider(root: View): (Map<String, Any?>) -> UiCheckAndroidScreenshotResult {
  return {
    val bitmap = Bitmap.createBitmap(root.width, root.height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    root.measure(
      View.MeasureSpec.makeMeasureSpec(root.width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(root.height, View.MeasureSpec.EXACTLY)
    )
    root.layout(root.left, root.top, root.left + root.width, root.top + root.height)
    root.invalidate()
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

private fun collectElements(root: View?): List<UiCheckAndroidElementInfo> {
  if (root == null) return emptyList()
  val elements = mutableListOf<UiCheckAndroidElementInfo>()

  fun visit(view: View) {
    normalizeView(view)?.let(elements::add)
    if (view is ViewGroup) {
      for (index in 0 until view.childCount) {
        visit(view.getChildAt(index))
      }
    }
  }

  visit(root)
  return elements
}

private fun viewportInfo(root: View?): UiCheckAndroidViewportInfo {
  if (root == null) return UiCheckAndroidViewportInfo()
  val metrics = root.resources.displayMetrics
  val width = root.width.takeIf { it > 0 } ?: metrics.widthPixels
  val height = root.height.takeIf { it > 0 } ?: metrics.heightPixels
  return UiCheckAndroidViewportInfo(
    width = width,
    height = height,
    devicePixelRatio = metrics.density.toDouble(),
    scrollX = root.scrollX,
    scrollY = root.scrollY
  )
}

private fun normalizeView(view: View): UiCheckAndroidElementInfo? {
  val frame = viewFrame(view) ?: return null
  val width = frame.width.roundToInt()
  val height = frame.height.roundToInt()
  val x = frame.x.roundToInt()
  val y = frame.y.roundToInt()
  val visible = view.visibility == View.VISIBLE && width > 0 && height > 0
  val resourceName = resourceEntryName(view)
  val accessibilityLabel = view.contentDescription?.toString()

  return UiCheckAndroidElementInfo(
    tag = view.javaClass.simpleName.ifBlank { "NativeView" },
    id = resourceName,
    testID = resourceName,
    accessibilityLabel = accessibilityLabel,
    classes = listOf(view.javaClass.name),
    text = compactText((view as? TextView)?.text?.toString() ?: accessibilityLabel),
    visible = visible,
    box = mapOf(
      "x" to x,
      "y" to y,
      "width" to width,
      "height" to height,
      "top" to y,
      "left" to x
    ),
    dataset = null
  )
}

private fun viewFrame(view: View): UiCheckAndroidRect? {
  if (view.width <= 0 || view.height <= 0) return null
  val location = rootRelativeLocation(view)
  return UiCheckAndroidRect(
    x = location[0].toDouble(),
    y = location[1].toDouble(),
    width = view.width.toDouble(),
    height = view.height.toDouble()
  )
}

private fun rootRelativeLocation(view: View): IntArray {
  var x = view.left - view.scrollX
  var y = view.top - view.scrollY
  var parentView = view.parent as? View
  while (parentView != null) {
    x += parentView.left - parentView.scrollX
    y += parentView.top - parentView.scrollY
    parentView = parentView.parent as? View
  }
  return intArrayOf(x, y)
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

private data class TreeBox(val x: Double, val y: Double, val width: Double, val height: Double) {
  val area: Double get() = width * height
  fun contains(child: TreeBox): Boolean =
    child.x >= x && child.y >= y && child.x + child.width <= x + width && child.y + child.height <= y + height
}

private fun createElementTree(elements: List<Map<String, Any?>>): List<Map<String, Any?>> {
  val boxes = elements.map { treeBox(it["box"] as? Map<*, *>) }
  val parents = elements.indices.map { findTreeParent(it, boxes) }
  val childrenByParent = mutableMapOf<Int, MutableList<Int>>()
  val roots = mutableListOf<Int>()

  elements.indices.forEach { index ->
    val parent = parents[index]
    if (parent == null) roots.add(index)
    else childrenByParent.getOrPut(parent) { mutableListOf() }.add(index)
  }

  fun build(index: Int): Map<String, Any?> {
    return elements[index] + mapOf("children" to childrenByParent[index].orEmpty().map(::build))
  }

  return roots.map(::build)
}

private fun treeBox(raw: Map<*, *>?): TreeBox? {
  val box = raw ?: return null
  val width = numberValue(box["width"]) ?: return null
  val height = numberValue(box["height"]) ?: return null
  if (width <= 0 || height <= 0) return null
  return TreeBox(
    x = numberValue(box["x"]) ?: numberValue(box["left"]) ?: 0.0,
    y = numberValue(box["y"]) ?: numberValue(box["top"]) ?: 0.0,
    width = width,
    height = height
  )
}

private fun findTreeParent(index: Int, boxes: List<TreeBox?>): Int? {
  val child = boxes[index] ?: return null
  var parentIndex: Int? = null
  var parentArea = Double.POSITIVE_INFINITY
  boxes.forEachIndexed { candidateIndex, candidate ->
    if (candidateIndex != index && candidate != null && candidate.area > child.area && candidate.contains(child) && candidate.area < parentArea) {
      parentArea = candidate.area
      parentIndex = candidateIndex
    }
  }
  return parentIndex
}

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
