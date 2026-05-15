import CoreGraphics
import XCTest
@testable import UICheckApple

#if canImport(AppKit)
import AppKit
#endif

final class UICheckAppleTests: XCTestCase {
  func testInspectRegisteredNativeElements() throws {
    let unregister = registerAppleUiCheckElement(
      UiCheckAppleElementRegistration(
        tag: "UIButton",
        testID: "submit-button",
        text: "Submit",
        accessibilityLabel: "Submit order",
        dataset: ["role": "primary-action"],
        frame: { CGRect(x: 12, y: 24, width: 120, height: 44) }
      )
    )
    defer { unregister() }

    let client = UiCheckAppleClient(
      options: UiCheckAppleOptions(
        title: "Apple integration",
        route: "/home",
        platform: "ios",
        viewport: { UiCheckAppleViewportInfo(width: 390, height: 844, devicePixelRatio: 3) }
      )
    )

    let result = client.inspectElements(["selector": "submit-button"])
    XCTAssertEqual(result["platform"] as? String, "apple-native")
    XCTAssertEqual(result["os"] as? String, "ios")
    XCTAssertEqual(result["url"] as? String, "/home")
    XCTAssertEqual(result["title"] as? String, "Apple integration")
    XCTAssertEqual(result["count"] as? Int, 1)

    let elements = try XCTUnwrap(result["elements"] as? [[String: Any]])
    let element = try XCTUnwrap(elements.first)
    XCTAssertEqual(element["tag"] as? String, "UIButton")
    XCTAssertEqual(element["selector"] as? String, "[testID=\"submit-button\"]")
    XCTAssertEqual(element["testID"] as? String, "submit-button")
    XCTAssertEqual(element["text"] as? String, "Submit")
    XCTAssertEqual(element["visible"] as? Bool, true)
    XCTAssertEqual(element["dataset"] as? [String: String], ["role": "primary-action"])
    let box = try XCTUnwrap(element["box"] as? [String: Int])
    XCTAssertEqual(box["x"], 12)
    XCTAssertEqual(box["y"], 24)
    XCTAssertEqual(box["width"], 120)
    XCTAssertEqual(box["height"], 44)
    try writeAppleEvidenceScreenshot()
  }

  func testFindsSmallestElementAtPoint() throws {
    let unregisterOuter = registerAppleUiCheckElement(
      UiCheckAppleElementRegistration(
        id: "outer",
        frame: { CGRect(x: 0, y: 0, width: 200, height: 200) }
      )
    )
    let unregisterInner = registerAppleUiCheckElement(
      UiCheckAppleElementRegistration(
        id: "inner",
        frame: { CGRect(x: 20, y: 20, width: 40, height: 40) }
      )
    )
    defer {
      unregisterOuter()
      unregisterInner()
    }

    let client = UiCheckAppleClient()
    let result = client.getElementAtPoint(["x": 25, "y": 25])
    let element = try XCTUnwrap(result["element"] as? [String: Any])
    XCTAssertEqual(element["id"] as? String, "inner")
    XCTAssertEqual(element["selector"] as? String, "#inner")
  }

  func testHandlesMcpToolRequest() async throws {
    let unregister = registerAppleUiCheckElement(
      UiCheckAppleElementRegistration(
        id: "submit",
        text: "Submit",
        frame: { CGRect(x: 10, y: 10, width: 80, height: 30) }
      )
    )
    defer { unregister() }

    let client = UiCheckAppleClient()
    let raw = """
    {"type":"request","id":"req-1","method":"inspect_elements","params":{"selector":"#submit"}}
    """
    let maybeResponse = await client.handleRequestForTesting(raw)
    let response = try XCTUnwrap(maybeResponse)
    let data = try XCTUnwrap(response.data(using: .utf8))
    let decoded = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    XCTAssertEqual(decoded["type"] as? String, "response")
    XCTAssertEqual(decoded["id"] as? String, "req-1")
    let result = try XCTUnwrap(decoded["result"] as? [String: Any])
    XCTAssertEqual(result["count"] as? Int, 1)
  }

  private func writeAppleEvidenceScreenshot() throws {
    #if canImport(AppKit)
    let size = NSSize(width: 393, height: 240)
    let image = NSImage(size: size)
    image.lockFocus()
    NSColor(calibratedRed: 0.97, green: 0.98, blue: 0.99, alpha: 1).setFill()
    NSRect(origin: .zero, size: size).fill()
    let titleAttributes: [NSAttributedString.Key: Any] = [
      .font: NSFont.boldSystemFont(ofSize: 22),
      .foregroundColor: NSColor(calibratedRed: 0.09, green: 0.16, blue: 0.30, alpha: 1)
    ]
    "UICheck Apple".draw(at: NSPoint(x: 24, y: 190), withAttributes: titleAttributes)
    NSColor(calibratedRed: 0.62, green: 0.85, blue: 1, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 24, y: 110, width: 180, height: 56), xRadius: 12, yRadius: 12).fill()
    let bodyAttributes: [NSAttributedString.Key: Any] = [
      .font: NSFont.monospacedSystemFont(ofSize: 14, weight: .regular),
      .foregroundColor: NSColor(calibratedRed: 0.10, green: 0.22, blue: 0.40, alpha: 1)
    ]
    "inspect_elements: passed".draw(at: NSPoint(x: 24, y: 70), withAttributes: bodyAttributes)
    "get_element_at_point: passed".draw(at: NSPoint(x: 24, y: 44), withAttributes: bodyAttributes)
    image.unlockFocus()

    guard
      let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:])
    else {
      return
    }
    let output = URL(fileURLWithPath: ".build/uicheck-test-artifacts/apple-native.png")
    try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    try png.write(to: output)
    #endif
  }
}
