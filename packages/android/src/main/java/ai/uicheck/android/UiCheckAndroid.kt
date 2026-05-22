package ai.uicheck.android

import android.app.Activity
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
  val activity: Activity? = null,
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
    "viewport" to viewportInfo(resolveRootView()).toMap()
  )

  fun inspectElements(params: Map<String, Any?> = emptyMap()): Map<String, Any?> {
    val includeHidden = params["includeHidden"] == true
    val limit = clampLimit(params["limit"])
    val search = elementSearch(params)
    val root = resolveRootView()
    val elements = collectElements(root)
      .asSequence()
      .filter { includeHidden || it.visible }
      .map { it.toMap() }
      .toList()
    val tree = filterElementTree(createElementTree(if (search == null) elements.take(limit) else elements), search)

    return compactMap(
      "platform" to "android-native",
      "viewport" to viewportInfo(root).toMap(),
      "count" to countElementTree(tree),
      "tree" to tree
    )
  }

  fun capturePage(params: Map<String, Any?> = emptyMap()): UiCheckAndroidScreenshotResult {
    options.screenshot?.let { return it(params) }
    val root = resolveRootView() ?: throw UiCheckAndroidException("capture_page requires an Android activity or screenshot provider")
    return captureAndroidView(root)
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

  private fun resolveRootView(): View? = options.rootView?.invoke() ?: options.activity?.window?.decorView?.rootView

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
  return { captureAndroidView(root) }
}

fun createAndroidActivityScreenshotProvider(activity: Activity): (Map<String, Any?>) -> UiCheckAndroidScreenshotResult {
  return { captureAndroidView(activity.window.decorView.rootView) }
}

private fun captureAndroidView(root: View): UiCheckAndroidScreenshotResult {
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
  return UiCheckAndroidScreenshotResult(
    width = root.width,
    height = root.height,
    mimeType = "image/png",
    base64 = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
  )
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

private fun elementSearch(params: Map<String, Any?>): Map<String, Any?>? {
  val search = mutableMapOf<String, Any?>()
  listOf("query", "selector", "styleName", "styleValue", "id", "testId", "text", "accessibilityLabel", "className", "role", "tag").forEach { key ->
    val value = params[key] as? String
    if (!value.isNullOrBlank()) search[key] = value.trim()
  }
  val styles = (params["styles"] as? Map<*, *>)
    ?.mapNotNull { (key, value) ->
      val name = key?.toString()?.trim().orEmpty()
      val text = value as? String
      if (name.isNotEmpty() && !text.isNullOrBlank()) name to text.trim() else null
    }
    ?.toMap()
  if (!styles.isNullOrEmpty()) search["styles"] = styles
  return search.ifEmpty { null }
}

private fun filterElementTree(tree: List<Map<String, Any?>>, search: Map<String, Any?>?): List<Map<String, Any?>> {
  if (search == null) return tree
  return tree.mapNotNull { node ->
    val children = (node["children"] as? List<*>)?.filterIsInstance<Map<String, Any?>>() ?: emptyList()
    val filteredChildren = filterElementTree(children, search)
    if (matchesElementSearch(node, search) || filteredChildren.isNotEmpty()) node + mapOf("children" to filteredChildren) else null
  }
}

private fun countElementTree(tree: List<Map<String, Any?>>): Int =
  tree.sumOf { node ->
    1 + countElementTree((node["children"] as? List<*>)?.filterIsInstance<Map<String, Any?>>() ?: emptyList())
  }

private fun matchesElementSearch(element: Map<String, Any?>, search: Map<String, Any?>): Boolean {
  (search["query"] as? String)?.let { if (!matchesAnyText(element, it)) return false }
  (search["selector"] as? String)?.let { if (!matchesSelectorText(element, it)) return false }
  (search["styleName"] as? String)?.let { if (!matchesStyle(element, it, search["styleValue"] as? String)) return false }
  (search["styles"] as? Map<*, *>)?.forEach { (name, value) ->
    if (!matchesStyle(element, name.toString(), value as? String)) return false
  }
  (search["id"] as? String)?.let { if (!matchesField(element["id"], it)) return false }
  (search["testId"] as? String)?.let { if (!matchesField(element["testId"] ?: element["testID"], it)) return false }
  (search["text"] as? String)?.let { if (!matchesField(element["text"], it)) return false }
  (search["accessibilityLabel"] as? String)?.let { if (!matchesField(element["accessibilityLabel"] ?: element["ariaLabel"] ?: element["semanticsLabel"], it)) return false }
  (search["className"] as? String)?.let { if (!matchesClasses(element["classes"], it)) return false }
  (search["role"] as? String)?.let { if (!matchesField(element["role"], it)) return false }
  (search["tag"] as? String)?.let { if (!matchesField(element["tag"], it)) return false }
  return true
}

private fun matchesSelectorText(element: Map<String, Any?>, selector: String): Boolean {
  val value = selector.trim()
  if (value.isEmpty()) return true
  if (value.startsWith("#")) return matchesField(element["id"], value.drop(1))
  if (value.startsWith(".")) return matchesClasses(element["classes"], value.drop(1))
  if (value.startsWith("[data-testid=") || value.startsWith("[data-test-id=")) {
    val testId = value.replace(Regex("^\\[data-test-?id=['\\\"]?"), "").replace(Regex("['\\\"]?]$"), "")
    return matchesField(element["testId"] ?: element["testID"], testId)
  }
  return matchesField(element["tag"], value) || matchesField(element["id"], value) || matchesClasses(element["classes"], value)
}

private fun matchesAnyText(element: Map<String, Any?>, query: String): Boolean =
  listOf(
    element["id"],
    element["testId"],
    element["testID"],
    element["text"],
    element["accessibilityLabel"],
    element["ariaLabel"],
    element["semanticsLabel"],
    element["role"],
    element["tag"]
  ).any { matchesField(it, query) } || matchesClasses(element["classes"], query)

private fun matchesStyle(element: Map<String, Any?>, name: String, query: String?): Boolean {
  val value = styleValue(element, name)
  if (query.isNullOrEmpty()) return value != null
  return matchesField(value, query)
}

private fun styleValue(element: Map<String, Any?>, name: String): Any? {
  val trimmed = name.trim()
  if (trimmed.isEmpty()) return null
  (element["style"] as? Map<*, *>)?.let { style ->
    pathValue(style, trimmed)?.let { return it }
  }
  return null
}

private fun pathValue(source: Map<*, *>, path: String): Any? {
  var current: Any? = source
  path.split(".").filter { it.isNotEmpty() }.forEach { part ->
    current = (current as? Map<*, *>)?.get(part) ?: return null
  }
  return current
}

private fun matchesField(value: Any?, query: String): Boolean =
  value?.toString()?.contains(query, ignoreCase = true) == true

private fun matchesClasses(value: Any?, query: String): Boolean =
  when (value) {
    is List<*> -> value.any { matchesField(it, query) }
    else -> matchesField(value, query)
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
