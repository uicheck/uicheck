// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "UICheckAppleDemo",
  platforms: [.macOS(.v12)],
  dependencies: [
    .package(path: "../../packages/apple")
  ],
  targets: [
    .target(
      name: "UICheckAppleDemoSupport"
    ),
    .executableTarget(
      name: "UICheckAppleDemo",
      dependencies: [
        .product(name: "UICheckApple", package: "apple"),
        "UICheckAppleDemoSupport"
      ]
    ),
    .testTarget(
      name: "UICheckAppleDemoTests",
      dependencies: [
        .product(name: "UICheckApple", package: "apple"),
        "UICheckAppleDemoSupport"
      ]
    )
  ]
)
