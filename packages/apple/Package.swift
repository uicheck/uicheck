// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "UICheckApple",
  platforms: [
    .iOS(.v15),
    .macOS(.v12),
    .tvOS(.v15),
    .visionOS(.v1)
  ],
  products: [
    .library(
      name: "UICheckApple",
      targets: ["UICheckApple"]
    )
  ],
  targets: [
    .target(
      name: "UICheckApple"
    ),
    .testTarget(
      name: "UICheckAppleTests",
      dependencies: ["UICheckApple"],
      exclude: ["Snapshots"]
    )
  ]
)
