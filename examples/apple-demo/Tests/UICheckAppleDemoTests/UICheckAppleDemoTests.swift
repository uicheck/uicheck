import XCTest
@testable import UICheckApple
import UICheckAppleDemoSupport

final class UICheckAppleDemoTests: XCTestCase {
  @MainActor
  func testInspectsRealExampleDemoWithUiCheck() async throws {
    let demo = createUICheckAppleDemoContent()

    let client = UiCheckAppleClient()
    let inspected = client.inspectElementsForTesting(["limit": 500], roots: [demo.screen])
    XCTAssertEqual(inspected["platform"] as? String, "apple-native")
    XCTAssertGreaterThanOrEqual(inspected["count"] as? Int ?? 0, 5)
    let inspectedJson = Self.stableJson(inspected)
    XCTAssertTrue(inspectedJson.contains("Runtime check 34"))
    XCTAssertTrue(inspectedJson.contains("Submit order"))
    try Self.writeTextArtifact("apple-demo-inspect-elements.snapshot.json", inspectedJson)
  }

  private static func writeTextArtifact(_ name: String, _ value: String) throws {
    let output = URL(fileURLWithPath: ".build/uicheck-test-artifacts").appendingPathComponent(name)
    try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    try value.appending("\n").write(to: output, atomically: true, encoding: .utf8)
  }

  private static func stableJson(_ value: Any) -> String {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys])
    return String(data: data, encoding: .utf8)!.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
