# uicheck_flutter

Flutter runtime client for UI Check. It connects a running Flutter app to `@uicheck/mcp` over WebSocket so AI agents can request screenshots, registered widget metadata, layout boxes, and coordinates through MCP tools.

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

final uicheckClient = installFlutterUiCheck(
  options: UiCheckFlutterOptions(
    title: 'Demo',
    route: '/home',
    socket: UiCheckSocketOptions(
      url: 'ws://127.0.0.1:17322/socket',
      clientId: 'flutter-demo',
    ),
    screenshot: (params) => captureRepaintBoundaryAsPng(
      repaintBoundaryKey: appBoundaryKey,
      title: 'Demo',
      url: '/home',
    ),
  ),
);
```

Register widgets that AI should inspect:

```dart
final submitButtonKey = GlobalKey();

final unregister = registerFlutterUiCheckElement(
  UiCheckFlutterElementRegistration(
    key: submitButtonKey,
    tag: 'ElevatedButton',
    testID: 'submit-button',
    text: 'Submit',
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

Dispose the client and unregister callbacks when they are no longer needed:

```dart
unregister();
uicheckClient.dispose();
```

## MCP Tools

| Tool | Description |
| --- | --- |
| `capture_page` | Uses the configured screenshot callback to return a PNG screenshot. |
| `inspect_elements` | Returns registered widget metadata, text, layout boxes, and visibility. |
| `get_element_at_point` | Returns the smallest registered widget at viewport coordinates. |

## Notes

Flutter does not expose a DOM query API. Register the widgets that AI needs to inspect with a `GlobalKey`. The client measures each registered widget through `RenderBox.localToGlobal`.
