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

public struct UiCheckAppleViewportInfo: Codable, Sendable {
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
  public var url: String?
  public var title: String?
  public var width: Int?
  public var height: Int?
  public var mimeType: String
  public var base64: String

  public init(url: String? = nil, title: String? = nil, width: Int? = nil, height: Int? = nil, mimeType: String = "image/png", base64: String) {
    self.url = url
    self.title = title
    self.width = width
    self.height = height
    self.mimeType = mimeType
    self.base64 = base64
  }

  public var jsonValue: [String: Any] {
    removeNilValues([
      "url": url,
      "title": title,
      "width": width,
      "height": height,
      "mimeType": mimeType,
      "base64": base64
    ])
  }
}

public struct UiCheckAppleOptions {
  public var socket: UiCheckAppleSocketOptions?
  public var title: String?
  public var route: String?
  public var platform: String?
  public var viewport: () -> UiCheckAppleViewportInfo
  public var screenshot: (([String: Any]) async throws -> UiCheckAppleScreenshotResult)?

  public init(
    socket: UiCheckAppleSocketOptions? = nil,
    title: String? = nil,
    route: String? = nil,
    platform: String? = nil,
    viewport: @escaping () -> UiCheckAppleViewportInfo = { UiCheckAppleViewportInfo() },
    screenshot: (([String: Any]) async throws -> UiCheckAppleScreenshotResult)? = nil
  ) {
    self.socket = socket
    self.title = title
    self.route = route
    self.platform = platform
    self.viewport = viewport
    self.screenshot = screenshot
  }
}

public struct UiCheckAppleElementRegistration {
  public var id: String?
  public var tag: String?
  public var selector: String?
  public var testID: String?
  public var text: String?
  public var accessibilityLabel: String?
  public var className: String?
  public var visible: Bool
  public var dataset: [String: String]?
  public var frame: () -> CGRect?

  public init(
    id: String? = nil,
    tag: String? = nil,
    selector: String? = nil,
    testID: String? = nil,
    text: String? = nil,
    accessibilityLabel: String? = nil,
    className: String? = nil,
    visible: Bool = true,
    dataset: [String: String]? = nil,
    frame: @escaping () -> CGRect?
  ) {
    self.id = id
    self.tag = tag
    self.selector = selector
    self.testID = testID
    self.text = text
    self.accessibilityLabel = accessibilityLabel
    self.className = className
    self.visible = visible
    self.dataset = dataset
    self.frame = frame
  }
}

public struct UiCheckAppleElementInfo: Sendable {
  public var tag: String
  public var selector: String
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
      "selector": selector,
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

private struct RegisteredAppleElement {
  var registration: UiCheckAppleElementRegistration
  var uid: Int
}

public final class UiCheckAppleClient: NSObject, URLSessionWebSocketDelegate, @unchecked Sendable {
  private let options: UiCheckAppleOptions
  private let session: URLSession
  private var socketTask: URLSessionWebSocketTask?
  private var reconnectTask: Task<Void, Never>?
  private var closed = false

  private static let registryLock = NSLock()
  private static var nextUid = 1
  private static var registry: [RegisteredAppleElement] = []

  public init(options: UiCheckAppleOptions = UiCheckAppleOptions(), session: URLSession? = nil) {
    self.options = options
    self.session = session ?? URLSession(configuration: .default)
    super.init()
  }

  public static func registerElement(_ registration: UiCheckAppleElementRegistration) -> () -> Void {
    registryLock.lock()
    let uid = nextUid
    nextUid += 1
    let item = RegisteredAppleElement(registration: registration, uid: uid)
    registry.append(item)
    registryLock.unlock()

    return {
      registryLock.lock()
      registry.removeAll { $0.uid == uid }
      registryLock.unlock()
    }
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
      "url": options.route,
      "title": options.title,
      "userAgent": options.platform ?? "apple-native",
      "viewport": options.viewport().jsonValue
    ])
  }

  public func inspectElements(_ params: [String: Any] = [:]) -> [String: Any] {
    let selector = params["selector"] as? String ?? "*"
    let includeHidden = params["includeHidden"] as? Bool == true
    let limit = clampLimit(params["limit"])
    let elements = registeredElements()
      .filter { matchesSelector($0, selector: selector) }
      .compactMap(normalizeElement)
      .filter { includeHidden || $0.visible }
      .prefix(limit)
      .map { $0.jsonValue }

    return removeNilValues([
      "platform": "apple-native",
      "os": options.platform,
      "url": options.route,
      "title": options.title,
      "viewport": options.viewport().jsonValue,
      "count": elements.count,
      "elements": Array(elements)
    ])
  }

  public func getElementAtPoint(_ params: [String: Any] = [:]) -> [String: Any] {
    let x = doubleValue(params["x"]) ?? 0
    let y = doubleValue(params["y"]) ?? 0
    let result = inspectElements([
      "selector": params["selector"] ?? "*",
      "includeHidden": false,
      "limit": 500
    ])
    let elements = (result["elements"] as? [[String: Any]] ?? [])
      .filter { containsPoint($0, x: x, y: y) }
      .sorted { boxArea($0) < boxArea($1) }

    return removeNilValues([
      "platform": "apple-native",
      "os": options.platform,
      "url": options.route,
      "title": options.title,
      "viewport": result["viewport"],
      "point": ["x": x, "y": y],
      "element": elements.first,
      "ancestors": []
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
      case "get_element_at_point":
        result = getElementAtPoint(params)
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

  private static func registeredElementsSnapshot() -> [RegisteredAppleElement] {
    registryLock.lock()
    defer { registryLock.unlock() }
    return registry
  }

  private func registeredElements() -> [RegisteredAppleElement] {
    Self.registeredElementsSnapshot()
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
public func installAppleUiCheck(options: UiCheckAppleOptions = UiCheckAppleOptions()) -> UiCheckAppleClient {
  let client = UiCheckAppleClient(options: options)
  client.connect()
  return client
}

@discardableResult
public func registerAppleUiCheckElement(_ registration: UiCheckAppleElementRegistration) -> () -> Void {
  UiCheckAppleClient.registerElement(registration)
}

#if canImport(UIKit)
@MainActor
@discardableResult
public func registerAppleUiCheckView(
  _ view: UIView,
  id: String? = nil,
  tag: String? = nil,
  selector: String? = nil,
  testID: String? = nil,
  text: String? = nil,
  accessibilityLabel: String? = nil,
  className: String? = nil,
  visible: Bool = true,
  dataset: [String: String]? = nil
) -> () -> Void {
  registerAppleUiCheckElement(
    UiCheckAppleElementRegistration(
      id: id,
      tag: tag ?? String(describing: type(of: view)),
      selector: selector,
      testID: testID ?? view.accessibilityIdentifier,
      text: text,
      accessibilityLabel: accessibilityLabel ?? view.accessibilityLabel,
      className: className,
      visible: visible,
      dataset: dataset,
      frame: { [weak view] in
        guard let view, let window = view.window else { return nil }
        return view.convert(view.bounds, to: window)
      }
    )
  )
}
#endif

#if canImport(AppKit)
@MainActor
@discardableResult
public func registerAppleUiCheckView(
  _ view: NSView,
  id: String? = nil,
  tag: String? = nil,
  selector: String? = nil,
  testID: String? = nil,
  text: String? = nil,
  accessibilityLabel: String? = nil,
  className: String? = nil,
  visible: Bool = true,
  dataset: [String: String]? = nil
) -> () -> Void {
  registerAppleUiCheckElement(
    UiCheckAppleElementRegistration(
      id: id,
      tag: tag ?? String(describing: type(of: view)),
      selector: selector,
      testID: testID ?? view.identifier?.rawValue,
      text: text,
      accessibilityLabel: accessibilityLabel,
      className: className,
      visible: visible,
      dataset: dataset,
      frame: { [weak view] in
        guard let view, let window = view.window else { return nil }
        return view.convert(view.bounds, to: nil).offsetBy(dx: window.frame.minX, dy: window.frame.minY)
      }
    )
  )
}
#endif

private func normalizeElement(_ item: RegisteredAppleElement) -> UiCheckAppleElementInfo? {
  guard let frame = item.registration.frame() else { return nil }
  let width = Int(frame.width.rounded())
  let height = Int(frame.height.rounded())
  let x = Int(frame.minX.rounded())
  let y = Int(frame.minY.rounded())
  let visible = item.registration.visible && width > 0 && height > 0
  return UiCheckAppleElementInfo(
    tag: item.registration.tag ?? "NativeView",
    selector: createSelector(item),
    id: item.registration.id,
    testID: item.registration.testID,
    accessibilityLabel: item.registration.accessibilityLabel,
    classes: classes(from: item.registration.className),
    text: compactText(item.registration.text ?? item.registration.accessibilityLabel),
    visible: visible,
    box: [
      "x": x,
      "y": y,
      "width": width,
      "height": height,
      "top": y,
      "left": x
    ],
    dataset: item.registration.dataset
  )
}

private func createSelector(_ item: RegisteredAppleElement) -> String {
  let registration = item.registration
  if let selector = registration.selector, !selector.isEmpty { return selector }
  if let id = registration.id, !id.isEmpty { return "#\(id)" }
  if let testID = registration.testID, !testID.isEmpty { return "[testID=\"\(testID)\"]" }
  if let accessibilityLabel = registration.accessibilityLabel, !accessibilityLabel.isEmpty {
    return "[accessibilityLabel=\"\(accessibilityLabel)\"]"
  }
  return "\(registration.tag ?? "NativeView"):registered(\(item.uid))"
}

private func matchesSelector(_ item: RegisteredAppleElement, selector: String) -> Bool {
  if selector.isEmpty || selector == "*" { return true }
  let registration = item.registration
  return registration.selector == selector ||
    registration.id == selector.replacingOccurrences(of: "^#", with: "", options: .regularExpression) ||
    registration.testID == selector ||
    registration.tag == selector ||
    createSelector(item) == selector
}

private func containsPoint(_ element: [String: Any], x: Double, y: Double) -> Bool {
  guard let box = element["box"] as? [String: Any] else { return false }
  let left = doubleValue(box["x"]) ?? 0
  let top = doubleValue(box["y"]) ?? 0
  let width = doubleValue(box["width"]) ?? 0
  let height = doubleValue(box["height"]) ?? 0
  return x >= left && x <= left + width && y >= top && y <= top + height
}

private func boxArea(_ element: [String: Any]) -> Double {
  guard let box = element["box"] as? [String: Any] else { return 0 }
  return (doubleValue(box["width"]) ?? 0) * (doubleValue(box["height"]) ?? 0)
}

private func doubleValue(_ value: Any?) -> Double? {
  if let value = value as? Double { return value }
  if let value = value as? Int { return Double(value) }
  if let value = value as? CGFloat { return Double(value) }
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
