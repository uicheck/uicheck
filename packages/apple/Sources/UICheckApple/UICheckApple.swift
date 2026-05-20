import Foundation

#if canImport(UIKit)
import UIKit
#endif

#if canImport(AppKit)
import AppKit
#endif

public struct UiCheckAppleSocketOptions: Sendable {
  public var url: String?
  public var clientId: String?
  public var reconnectMs: Int
  public var enabled: Bool

  public init(url: String? = nil, clientId: String? = nil, reconnectMs: Int = 1000, enabled: Bool = true) {
    self.url = url
    self.clientId = clientId
    self.reconnectMs = reconnectMs
    self.enabled = enabled
  }
}

private struct UiCheckAppleViewportInfo {
  public var width: Int
  public var height: Int
  public var devicePixelRatio: Double
  public var scrollX: Int
  public var scrollY: Int

  public init(width: Int = 0, height: Int = 0, devicePixelRatio: Double = 1, scrollX: Int = 0, scrollY: Int = 0) {
    self.width = width
    self.height = height
    self.devicePixelRatio = devicePixelRatio
    self.scrollX = scrollX
    self.scrollY = scrollY
  }

  public var jsonValue: [String: Any] {
    [
      "width": width,
      "height": height,
      "devicePixelRatio": devicePixelRatio,
      "scrollX": scrollX,
      "scrollY": scrollY
    ]
  }
}

public struct UiCheckAppleScreenshotResult: Sendable {
  public var width: Int?
  public var height: Int?
  public var mimeType: String
  public var base64: String

  public init(width: Int? = nil, height: Int? = nil, mimeType: String = "image/png", base64: String) {
    self.width = width
    self.height = height
    self.mimeType = mimeType
    self.base64 = base64
  }

  public var jsonValue: [String: Any] {
    removeNilValues([
      "width": width,
      "height": height,
      "mimeType": mimeType,
      "base64": base64
    ])
  }
}

public struct UiCheckAppleOptions {
  public var socket: UiCheckAppleSocketOptions?
  public var screenshot: (([String: Any]) async throws -> UiCheckAppleScreenshotResult)?

  public init(
    socket: UiCheckAppleSocketOptions? = nil,
    screenshot: (([String: Any]) async throws -> UiCheckAppleScreenshotResult)? = nil
  ) {
    self.socket = socket
    self.screenshot = screenshot
  }
}

public struct UiCheckAppleElementInfo: Sendable {
  public var tag: String
  public var id: String?
  public var testID: String?
  public var accessibilityLabel: String?
  public var classes: [String]
  public var text: String?
  public var visible: Bool
  public var box: [String: Int]
  public var dataset: [String: String]?

  public var jsonValue: [String: Any] {
    removeNilValues([
      "tag": tag,
      "id": id,
      "testID": testID,
      "accessibilityLabel": accessibilityLabel,
      "classes": classes,
      "text": text,
      "visible": visible,
      "box": box,
      "dataset": dataset
    ])
  }
}

public final class UiCheckAppleClient: NSObject, URLSessionWebSocketDelegate, @unchecked Sendable {
  private let options: UiCheckAppleOptions
  private let session: URLSession
  private var socketTask: URLSessionWebSocketTask?
  private var reconnectTask: Task<Void, Never>?
  private var closed = false

  public init(options: UiCheckAppleOptions = UiCheckAppleOptions(), session: URLSession? = nil) {
    self.options = options
    self.session = session ?? URLSession(configuration: .default)
    super.init()
  }

  public func connect() {
    guard let socket = options.socket, socket.enabled, let rawUrl = socket.url, !rawUrl.isEmpty else { return }
    closed = false
    guard let url = URL(string: appendClientId(rawUrl, socket.clientId)) else { return }
    socketTask?.cancel(with: .goingAway, reason: nil)
    let task = session.webSocketTask(with: url)
    socketTask = task
    task.resume()
    sendClientInfo(type: "hello")
    receiveLoop()
  }

  public func close() {
    closed = true
    reconnectTask?.cancel()
    socketTask?.cancel(with: .goingAway, reason: nil)
  }

  public func clientInfo() -> [String: Any] {
    removeNilValues([
      "userAgent": "apple-native",
      "viewport": defaultAppleViewportInfo().jsonValue
    ])
  }

  public func inspectElements(_ params: [String: Any] = [:]) -> [String: Any] {
    let includeHidden = params["includeHidden"] as? Bool == true
    let limit = clampLimit(params["limit"])
    let elements = collectAppleElements(defaultAppleRootViews())
      .filter { includeHidden || $0.visible }
      .prefix(limit)
      .map { $0.jsonValue }

    return removeNilValues([
      "platform": "apple-native",
      "viewport": defaultAppleViewportInfo().jsonValue,
      "count": elements.count,
      "tree": createElementTree(Array(elements))
    ])
  }

  public func capturePage(_ params: [String: Any] = [:]) async throws -> UiCheckAppleScreenshotResult {
    guard let screenshot = options.screenshot else {
      throw UiCheckAppleError.captureRequiresScreenshotProvider
    }
    return try await screenshot(params)
  }

  internal func handleRequestForTesting(_ raw: String) async -> String? {
    await handleRequest(raw)
  }

  private func receiveLoop() {
    socketTask?.receive { [weak self] result in
      guard let self else { return }
      switch result {
      case .success(let message):
        let raw: String
        switch message {
        case .string(let value):
          raw = value
        case .data(let data):
          raw = String(data: data, encoding: .utf8) ?? ""
        @unknown default:
          raw = ""
        }
        Task {
          if let response = await self.handleRequest(raw) {
            self.send(response)
          }
        }
        if !self.closed {
          self.receiveLoop()
        }
      case .failure:
        self.scheduleReconnect()
      }
    }
  }

  private func handleRequest(_ raw: String) async -> String? {
    guard
      let data = raw.data(using: .utf8),
      let decoded = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      decoded["type"] as? String == "request",
      let id = decoded["id"] as? String
    else {
      return nil
    }

    do {
      let params = decoded["params"] as? [String: Any] ?? [:]
      let method = decoded["method"] as? String
      let result: Any
      switch method {
      case "capture_page":
        result = try await capturePage(params).jsonValue
      case "inspect_elements":
        result = inspectElements(params)
      default:
        throw UiCheckAppleError.unknownMethod(method ?? "")
      }
      return jsonString(["type": "response", "id": id, "result": result])
    } catch {
      return jsonString(["type": "response", "id": id, "error": String(describing: error)])
    }
  }

  private func sendClientInfo(type: String) {
    var payload = clientInfo()
    payload["type"] = type
    if let json = jsonString(payload) {
      send(json)
    }
  }

  private func send(_ value: String) {
    socketTask?.send(.string(value)) { _ in }
  }

  private func scheduleReconnect() {
    guard !closed else { return }
    reconnectTask?.cancel()
    let delay = UInt64(options.socket?.reconnectMs ?? 1000) * 1_000_000
    reconnectTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: delay)
      guard !Task.isCancelled else { return }
      self?.connect()
    }
  }
}

public enum UiCheckAppleError: Error, CustomStringConvertible {
  case captureRequiresScreenshotProvider
  case unknownMethod(String)

  public var description: String {
    switch self {
    case .captureRequiresScreenshotProvider:
      return "capture_page requires an Apple native screenshot provider"
    case .unknownMethod(let method):
      return "Unknown uicheck method: \(method)"
    }
  }
}

@discardableResult
public func initUiCheck(_ options: UiCheckAppleOptions = UiCheckAppleOptions()) -> UiCheckAppleClient {
  let client = UiCheckAppleClient(options: options)
  client.connect()
  return client
}

private func collectAppleElements(_ roots: [Any]) -> [UiCheckAppleElementInfo] {
  var elements: [UiCheckAppleElementInfo] = []
  for root in roots {
    visitAppleView(root, output: &elements)
  }
  return elements
}

private struct TreeBox {
  let x: Int
  let y: Int
  let width: Int
  let height: Int

  var area: Int { width * height }

  func contains(_ child: TreeBox) -> Bool {
    child.x >= x &&
      child.y >= y &&
      child.x + child.width <= x + width &&
      child.y + child.height <= y + height
  }
}

private func createElementTree(_ elements: [[String: Any]]) -> [[String: Any]] {
  let boxes = elements.map { treeBox($0["box"] as? [String: Any]) }
  let parents = elements.indices.map { findTreeParent(index: $0, boxes: boxes) }
  var childrenByParent: [Int: [Int]] = [:]
  var roots: [Int] = []

  for index in elements.indices {
    if let parent = parents[index] {
      childrenByParent[parent, default: []].append(index)
    } else {
      roots.append(index)
    }
  }

  func build(_ index: Int) -> [String: Any] {
    var node = elements[index]
    node["children"] = (childrenByParent[index] ?? []).map(build)
    return node
  }

  return roots.map(build)
}

private func treeBox(_ raw: [String: Any]?) -> TreeBox? {
  guard
    let raw,
    let width = numberValue(raw["width"]),
    let height = numberValue(raw["height"]),
    width > 0,
    height > 0
  else {
    return nil
  }
  return TreeBox(
    x: numberValue(raw["x"]) ?? numberValue(raw["left"]) ?? 0,
    y: numberValue(raw["y"]) ?? numberValue(raw["top"]) ?? 0,
    width: width,
    height: height
  )
}

private func findTreeParent(index: Int, boxes: [TreeBox?]) -> Int? {
  guard let child = boxes[index] else { return nil }
  var parentIndex: Int?
  var parentArea = Int.max

  for candidateIndex in boxes.indices {
    guard candidateIndex != index, let candidate = boxes[candidateIndex] else { continue }
    guard candidate.area > child.area, candidate.contains(child), candidate.area < parentArea else { continue }
    parentArea = candidate.area
    parentIndex = candidateIndex
  }

  return parentIndex
}

private func defaultAppleRootViews() -> [Any] {
  #if canImport(UIKit)
  return runOnMainThread {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .compactMap { $0.rootViewController?.view ?? $0.subviews.first }
  }
  #elseif canImport(AppKit)
  return runOnMainThread {
    NSApplication.shared.windows.compactMap { $0.contentView }
  }
  #else
  return []
  #endif
}

private func defaultAppleViewportInfo() -> UiCheckAppleViewportInfo {
  #if canImport(UIKit)
  return runOnMainThread {
    guard
      let window = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .flatMap({ $0.windows })
        .first(where: { !$0.isHidden })
    else {
      return UiCheckAppleViewportInfo()
    }
    let bounds = window.bounds
    return UiCheckAppleViewportInfo(
      width: Int(bounds.width.rounded()),
      height: Int(bounds.height.rounded()),
      devicePixelRatio: Double(window.screen.scale)
    )
  }
  #elseif canImport(AppKit)
  return runOnMainThread {
    guard let window = NSApplication.shared.windows.first(where: { $0.isVisible }) ?? NSApplication.shared.windows.first else {
      return UiCheckAppleViewportInfo()
    }
    let frame = window.contentView?.bounds ?? window.frame
    return UiCheckAppleViewportInfo(
      width: Int(frame.width.rounded()),
      height: Int(frame.height.rounded()),
      devicePixelRatio: Double(window.backingScaleFactor)
    )
  }
  #else
  return UiCheckAppleViewportInfo()
  #endif
}

private func runOnMainThread<T>(_ body: () -> T) -> T {
  if Thread.isMainThread {
    return body()
  }
  var output: T?
  DispatchQueue.main.sync {
    output = body()
  }
  return output!
}

private func visitAppleView(_ view: Any, output: inout [UiCheckAppleElementInfo]) {
  normalizeAppleView(view).map { output.append($0) }

  #if canImport(UIKit)
  if let view = view as? UIView {
    for child in view.subviews {
      visitAppleView(child, output: &output)
    }
    return
  }
  #endif

  #if canImport(AppKit)
  if let view = view as? NSView {
    for child in view.subviews {
      visitAppleView(child, output: &output)
    }
  }
  #endif
}

private func normalizeAppleView(_ view: Any) -> UiCheckAppleElementInfo? {
  #if canImport(UIKit)
  if let view = view as? UIView {
    guard let frame = uiKitFrame(view) else { return nil }
    return normalizeAppleFrame(
      frame,
      tag: String(describing: type(of: view)),
      id: view.accessibilityIdentifier,
      testID: view.accessibilityIdentifier,
      accessibilityLabel: view.accessibilityLabel,
      text: uiKitText(view),
      visible: !view.isHidden && view.alpha > 0.01,
      className: String(describing: type(of: view))
    )
  }
  #endif

  #if canImport(AppKit)
  if let view = view as? NSView {
    guard let frame = appKitFrame(view) else { return nil }
    let id = view.identifier?.rawValue
    return normalizeAppleFrame(
      frame,
      tag: String(describing: type(of: view)),
      id: id,
      testID: id,
      accessibilityLabel: view.accessibilityLabel(),
      text: appKitText(view),
      visible: !view.isHidden,
      className: String(describing: type(of: view))
    )
  }
  #endif

  return nil
}

private func normalizeAppleFrame(
  _ frame: CGRect,
  tag: String,
  id: String?,
  testID: String?,
  accessibilityLabel: String?,
  text: String?,
  visible: Bool,
  className: String
) -> UiCheckAppleElementInfo? {
  let width = Int(frame.width.rounded())
  let height = Int(frame.height.rounded())
  let x = Int(frame.minX.rounded())
  let y = Int(frame.minY.rounded())
  return UiCheckAppleElementInfo(
    tag: tag,
    id: id,
    testID: testID,
    accessibilityLabel: accessibilityLabel,
    classes: [className],
    text: compactText(text ?? accessibilityLabel),
    visible: visible && width > 0 && height > 0,
    box: [
      "x": x,
      "y": y,
      "width": width,
      "height": height,
      "top": y,
      "left": x
    ],
    dataset: nil
  )
}

#if canImport(UIKit)
private func uiKitFrame(_ view: UIView) -> CGRect? {
  guard view.bounds.width > 0, view.bounds.height > 0 else { return nil }
  if let window = view.window {
    return view.convert(view.bounds, to: window)
  }
  return view.convert(view.bounds, to: nil)
}

private func uiKitText(_ view: UIView) -> String? {
  if let label = view as? UILabel { return label.text }
  if let button = view as? UIButton { return button.title(for: .normal) }
  if let textField = view as? UITextField { return textField.text }
  if let textView = view as? UITextView { return textView.text }
  return nil
}
#endif

#if canImport(AppKit)
private func appKitFrame(_ view: NSView) -> CGRect? {
  guard view.bounds.width > 0, view.bounds.height > 0 else { return nil }
  if let window = view.window {
    return view.convert(view.bounds, to: nil).offsetBy(dx: window.frame.minX, dy: window.frame.minY)
  }
  return view.convert(view.bounds, to: nil)
}

private func appKitText(_ view: NSView) -> String? {
  if let label = view as? NSTextField { return label.stringValue }
  if let button = view as? NSButton { return button.title }
  return nil
}
#endif

private func doubleValue(_ value: Any?) -> Double? {
  if let value = value as? Double { return value }
  if let value = value as? Int { return Double(value) }
  if let value = value as? CGFloat { return Double(value) }
  return nil
}

private func numberValue(_ value: Any?) -> Int? {
  if let value = value as? Int { return value }
  if let value = value as? Double { return Int(value.rounded()) }
  if let value = value as? CGFloat { return Int(value.rounded()) }
  if let value = value as? String, let parsed = Double(value) { return Int(parsed.rounded()) }
  return nil
}

private func clampLimit(_ value: Any?) -> Int {
  let number = Int(doubleValue(value) ?? 80)
  return min(max(number, 1), 500)
}

private func compactText(_ value: String?) -> String? {
  guard let value else { return nil }
  let text = value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
  if text.isEmpty { return nil }
  if text.count <= 160 { return text }
  return String(text.prefix(157)) + "..."
}

private func classes(from value: String?) -> [String] {
  value?.split(whereSeparator: { $0.isWhitespace }).map(String.init) ?? []
}

private func appendClientId(_ rawUrl: String, _ clientId: String?) -> String {
  guard let clientId, !clientId.isEmpty else { return rawUrl }
  let joiner = rawUrl.contains("?") ? "&" : "?"
  return "\(rawUrl)\(joiner)clientId=\(clientId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? clientId)"
}

private func jsonString(_ value: Any) -> String? {
  guard JSONSerialization.isValidJSONObject(value),
        let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
        let string = String(data: data, encoding: .utf8) else {
    return nil
  }
  return string
}

private func removeNilValues(_ input: [String: Any?]) -> [String: Any] {
  var result: [String: Any] = [:]
  for (key, value) in input {
    if let value {
      result[key] = value
    }
  }
  return result
}
