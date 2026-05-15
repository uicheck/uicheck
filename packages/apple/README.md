# UICheckApple

Apple native runtime client for UI Check. It connects iOS, macOS, tvOS, or visionOS apps to `@uicheck/mcp` over WebSocket so AI agents can request screenshots, registered native view metadata, layout boxes, and coordinates through MCP tools.

## Install

Add this repository as a Swift Package dependency and select the `UICheckApple` product:

```txt
https://github.com/uicheck/uicheck
```

Package path:

```txt
packages/apple
```

Start the MCP server separately:

```sh
npm install -g @uicheck/mcp
uicheck-mcp
```

## Usage

Install the client near app startup:

```swift
import UICheckApple

let client = installAppleUiCheck(
  options: UiCheckAppleOptions(
    socket: UiCheckAppleSocketOptions(
      url: "ws://127.0.0.1:17322/socket",
      clientId: "ios-demo"
    ),
    title: "Demo",
    route: "/home",
    platform: "ios",
    viewport: {
      UiCheckAppleViewportInfo(width: 390, height: 844, devicePixelRatio: 3)
    },
    screenshot: { params in
      UiCheckAppleScreenshotResult(
        title: "Demo",
        width: 390,
        height: 844,
        mimeType: "image/png",
        base64: captureAppAsBase64Png()
      )
    }
  )
)
```

Register views that AI should inspect:

```swift
let unregister = registerAppleUiCheckView(
  submitButton,
  tag: "UIButton",
  testID: "submit-button",
  text: "Submit"
)
```

You can also register a custom frame provider when integrating with SwiftUI or non-view abstractions:

```swift
let unregister = registerAppleUiCheckElement(
  UiCheckAppleElementRegistration(
    tag: "Button",
    testID: "submit-button",
    text: "Submit",
    frame: { CGRect(x: 12, y: 24, width: 120, height: 44) }
  )
)
```

Dispose when no longer needed:

```swift
unregister()
client.close()
```

## MCP Tools

| Tool | Description |
| --- | --- |
| `capture_page` | Uses the configured screenshot provider to return a PNG screenshot. |
| `inspect_elements` | Returns registered native view metadata, text, layout boxes, and visibility. |
| `get_element_at_point` | Returns the smallest registered view at viewport coordinates. |

## Notes

Apple native apps do not expose a DOM query API. Register the views or components that AI needs to inspect. UIKit and AppKit helpers measure registered views in window coordinates.
