# UICheckApple

Apple 原生运行时客户端。它把 iOS、macOS、tvOS 或 visionOS 应用通过 WebSocket 接到 `@uicheck/mcp`，让 AI 请求截图并检查 UIKit/AppKit view tree。

## 安装

把这个仓库作为 Swift Package 依赖添加，并选择 `UICheckApple` product：

```txt
https://github.com/uicheck/uicheck
```

包路径：

```txt
packages/apple
```

单独启动 MCP 服务：

```sh
npx @uicheck/mcp
```

## 使用

在应用启动时安装客户端：

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

不再需要时释放：

```swift
client.close()
```

## 选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `socket.url` | `String` | - | `@uicheck/mcp` WebSocket 地址 |
| `socket.clientId` | `String` | - | 可选的稳定客户端 ID |
| `socket.reconnectMs` | `Int` | `1000` | 断线重连间隔 |
| `screenshot` | `function` | - | 可选截图函数，返回 PNG base64 |
