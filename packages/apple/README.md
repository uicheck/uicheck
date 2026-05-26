# UICheckApple

Apple native runtime client for UI Check. It connects iOS, macOS, tvOS, or visionOS apps to `@uicheck/mcp` over WebSocket so AI agents can request screenshots and inspect the live UIKit/AppKit view tree.

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
npx @uicheck/mcp
```

## Usage

Install the client near app startup:

```swift
import UICheckApple

let client = initUiCheck(
  UiCheckAppleOptions(
    socket: UiCheckAppleSocketOptions(
      clientId: "ios-demo"
    ),
    screenshot: { params in
      UiCheckAppleScreenshotResult(
        width: 390,
        height: 844,
        mimeType: "image/png",
        base64: captureAppAsBase64Png()
      )
    }
  )
)
```

Dispose when no longer needed:

```swift
client.close()
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `socket.url` | `String` | - | `@uicheck/mcp` WebSocket URL |
| `socket.clientId` | `String` | - | Optional stable client id |
| `socket.reconnectMs` | `Int` | `1000` | Reconnect interval |
| `screenshot` | `function` | - | Optional screenshot function for `capture_page`, `capture_element`, and `compare_screenshot`, returning PNG base64 |
