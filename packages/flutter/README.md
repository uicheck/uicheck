# uicheck_flutter

Flutter runtime client for UI Check. It connects a running Flutter app to `@uicheck/mcp` over WebSocket so AI agents can request screenshots and inspect the live Flutter render tree.

## Usage

Add the package:

```sh
flutter pub add uicheck_flutter
```

Start the MCP server separately:

```sh
npm install -g @uicheck/mcp
uicheck-mcp
```

Install the Flutter client near app startup:

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

Wrap the app or screen in a `RepaintBoundary` when using the screenshot helper:

```dart
final appBoundaryKey = GlobalKey();

RepaintBoundary(
  key: appBoundaryKey,
  child: MyApp(),
);
```

Dispose the client when it is no longer needed:

```dart
uicheckClient.dispose();
```

## MCP Tools

| Tool | Description |
| --- | --- |
| `capture_page` | Uses the configured screenshot callback to return a PNG screenshot. |
| `inspect_elements` | Returns render tree metadata, text, layout boxes, and visibility. |
