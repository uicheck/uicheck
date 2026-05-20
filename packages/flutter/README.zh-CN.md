# uicheck_flutter

Flutter 运行时客户端。它把真实 Flutter 应用通过 WebSocket 接到 `@uicheck/mcp`，让 AI 请求截图并检查 Flutter render tree。

## 使用

添加依赖：

```sh
flutter pub add uicheck_flutter
```

单独启动 MCP 服务：

```sh
npm install -g @uicheck/mcp
uicheck-mcp
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

## MCP 工具

| 工具 | 说明 |
| --- | --- |
| `capture_page` | 使用配置的截图回调返回 PNG 截图。 |
| `inspect_elements` | 返回 render tree 元数据、文本、布局盒和可见性。 |
