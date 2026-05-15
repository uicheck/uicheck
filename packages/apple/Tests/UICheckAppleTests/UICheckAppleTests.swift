import CoreGraphics
import XCTest
@testable import UICheckApple

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
}
