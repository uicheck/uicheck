import CoreGraphics
import XCTest
@testable import UICheckApple

#if canImport(AppKit)
import AppKit
#endif

final class UICheckAppleTests: XCTestCase {
  @MainActor
  func testCaptureElementUsesScreenshotProviderWithSearchParams() async throws {
    var receivedParams: [String: Any] = [:]
    let client = UiCheckAppleClient(
      options: UiCheckAppleOptions(
        screenshot: { params in
          receivedParams = params
          return UiCheckAppleScreenshotResult(mimeType: "image/png", base64: "YXBwbGUtZWxlbWVudA==")
        }
      )
    )

    let result = try await client.captureElement(["text": "Submit order"])

    XCTAssertEqual(result.base64, "YXBwbGUtZWxlbWVudA==")
    XCTAssertEqual(receivedParams["text"] as? String, "Submit order")
  }

  @MainActor
  func testInspectElementsRealNativeDemo() async throws {
    #if canImport(AppKit)
    let demo = createAppleDemo()

    let client = UiCheckAppleClient()

    let result = client.inspectElementsForTesting(roots: [demo.root])
    XCTAssertEqual(result["platform"] as? String, "apple-native")
    XCTAssertEqual(result["count"] as? Int, 5)

    let tree = try XCTUnwrap(result["tree"] as? [[String: Any]])
    let element = try XCTUnwrap(flattenTree(tree).last)
    XCTAssertEqual(element["tag"] as? String, "NSButton")
    XCTAssertEqual(element["testID"] as? String, "submit-button")
    XCTAssertEqual(element["text"] as? String, "Submit order")
    XCTAssertEqual(element["visible"] as? Bool, true)
    #endif
  }

  @MainActor
  func testInspectElementsCanReturnOnlyMatchingParentTree() async throws {
    #if canImport(AppKit)
    let demo = createAppleDemo()
    let client = UiCheckAppleClient()

    let result = client.inspectElementsForTesting(["testId": "submit-button"], roots: [demo.root])
    XCTAssertEqual(result["count"] as? Int, 2)
    let tree = try XCTUnwrap(result["tree"] as? [[String: Any]])
    let elements = flattenTree(tree)
    XCTAssertEqual(elements.count, 2)
    XCTAssertEqual(elements[0]["tag"] as? String, "NSView")
    XCTAssertEqual(elements[1]["tag"] as? String, "NSButton")
    XCTAssertEqual(elements[1]["testID"] as? String, "submit-button")
    #endif
  }

  @MainActor
  func testHandlesMcpToolRequest() async throws {
    #if canImport(AppKit)
    let view = NSTextField(labelWithString: "Submit")
    view.identifier = NSUserInterfaceItemIdentifier("submit")
    view.frame = CGRect(x: 10, y: 10, width: 80, height: 30)
    let client = UiCheckAppleClient()
    let raw = """
    {"type":"request","id":"req-1","method":"inspect_elements","params":{"limit":1}}
    """
    let maybeResponse = await client.handleRequestForTesting(raw)
    let response = try XCTUnwrap(maybeResponse)
    let data = try XCTUnwrap(response.data(using: .utf8))
    let decoded = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    XCTAssertEqual(decoded["type"] as? String, "response")
    XCTAssertEqual(decoded["id"] as? String, "req-1")
    let result = try XCTUnwrap(decoded["result"] as? [String: Any])
    XCTAssertEqual(result["count"] as? Int, 0)
    #endif
  }

  @MainActor
  private func createAppleDemo() -> (root: NSView, title: NSTextField, summary: NSTextField, status: NSTextField, submit: NSButton) {
    #if canImport(AppKit)
    let root = NSView(frame: NSRect(x: 0, y: 0, width: 393, height: 640))
    root.identifier = NSUserInterfaceItemIdentifier("screen")
    root.wantsLayer = true
    root.layer?.backgroundColor = NSColor(calibratedRed: 0.97, green: 0.98, blue: 0.99, alpha: 1).cgColor

    let title = NSTextField(labelWithString: "Apple checkout")
    title.identifier = NSUserInterfaceItemIdentifier("title")
    title.frame = NSRect(x: 24, y: 582, width: 240, height: 34)
    title.font = .boldSystemFont(ofSize: 22)

    let summary = NSTextField(labelWithString: "Registered ref summary")
    summary.identifier = NSUserInterfaceItemIdentifier("summary-card")
    summary.frame = NSRect(x: 24, y: 416, width: 345, height: 126)
    summary.wantsLayer = true
    summary.layer?.backgroundColor = NSColor.white.cgColor

    let status = NSTextField(labelWithString: "Ready for MCP inspection")
    status.identifier = NSUserInterfaceItemIdentifier("status-card")
    status.frame = NSRect(x: 24, y: 296, width: 345, height: 104)
    status.wantsLayer = true
    status.layer?.backgroundColor = NSColor.white.cgColor

    let submit = NSButton(title: "Submit order", target: nil, action: nil)
    submit.identifier = NSUserInterfaceItemIdentifier("submit-button")
    submit.frame = NSRect(x: 24, y: 24, width: 345, height: 54)

    root.addSubview(title)
    root.addSubview(summary)
    root.addSubview(status)
    root.addSubview(submit)
    return (root, title, summary, status, submit)
    #else
    fatalError("AppKit is required for the Apple demo")
    #endif
  }

  private func flattenTree(_ nodes: [[String: Any]]) -> [[String: Any]] {
    nodes.flatMap { node -> [[String: Any]] in
      let children = node["children"] as? [[String: Any]] ?? []
      return [node] + flattenTree(children)
    }
  }

}
