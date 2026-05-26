# uicheck_flutter

Flutter 运行时客户端。它把真实 Flutter 应用通过 WebSocket 接到 `@uicheck/mcp`，让 AI 请求截图并检查 Flutter render tree。

## 使用

添加依赖：

```sh
flutter pub add uicheck_flutter
```

单独启动 MCP 服务：

```sh
npx @uicheck/mcp
```

在应用启动时安装客户端：

```dart
import 'package:flutter/widgets.dart';
import 'package:uicheck_flutter/uicheck_flutter.dart';

final uicheckClient = initUiCheck(
  UiCheckFlutterOptions(
    socket: UiCheckSocketOptions(
      clientId: 'flutter-demo',
    ),
    screenshot: (params) => captureRepaintBoundaryAsPng(
      repaintBoundaryKey: appBoundaryKey,
    ),
  ),
);
```

使用截图 helper 时，把应用或页面包在 `RepaintBoundary` 里：

```dart
final appBoundaryKey = GlobalKey();

RepaintBoundary(
  key: appBoundaryKey,
  child: MyApp(),
);
```

不再需要时释放客户端：

```dart
uicheckClient.dispose();
```

## 选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `socket.url` | `String` | - | `@uicheck/mcp` WebSocket 地址 |
| `socket.clientId` | `String` | - | 可选的稳定客户端 ID |
| `socket.reconnectMs` | `int` | `1000` | 断线重连间隔 |
| `screenshot` | `UiCheckScreenshotProvider` | - | 可选截图函数，用于 `capture_page`、`capture_element` 和 `compare_screenshot`，返回 PNG base64 |
