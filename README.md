<p align="center">
  <img src=".github/assets/uicheck-logo.svg" width="96" height="96" alt="UI Check logo" />
</p>

# UI Check

AI-readable runtime UI inspection for browser, React Native, Flutter, Android native, Apple native, and Taro Mini Program apps.

UI Check connects live app runtimes to AI agents through MCP. It exposes screenshots, element metadata, layout boxes, coordinates, and route state so AI can debug UI issues against the real running app instead of guessing from code alone.

Website: https://uicheck.ai

GitHub: https://github.com/uicheck/uicheck

## Packages

| Package | Description |
| --- | --- |
| `@uicheck/core` | Shared WebSocket protocol runtime and types |
| `@uicheck/web` | Browser DOM runtime client with screenshot and element inspection |
| `@uicheck/rn` | React Native client using registered refs for element inspection |
| `@uicheck/taro` | Taro Mini Program client using selector query inspection |
| `uicheck_flutter` | Flutter client using registered GlobalKeys for widget inspection |
| `uicheck_android` | Android native Kotlin client using registered views for element inspection |
| `uicheck_apple` | Apple native Swift client using registered views for element inspection |
| `@uicheck/mcp` | Local MCP server exposing UI inspection tools to AI agents |

## Quick Start

Start the MCP server:

```sh
npm install -g @uicheck/mcp
uicheck-mcp
```

Install the browser client:

```sh
npm install @uicheck/web html2canvas
```

```ts
import html2canvas from 'html2canvas'
import { installUiCheck } from '@uicheck/web'

installUiCheck(html2canvas, {
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```

Taro Mini Program client:

```sh
npm install @uicheck/taro
```

```ts
import Taro from '@tarojs/taro'
import { installTaroUiCheck } from '@uicheck/taro'

installTaroUiCheck(Taro, {
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```

React Native client:

```sh
npm install @uicheck/rn
```

```ts
import { AppState, Dimensions, Platform } from 'react-native'
import {
  installReactNativeUiCheck,
  registerReactNativeUiCheckElement
} from '@uicheck/rn'

installReactNativeUiCheck(
  { AppState, Dimensions, Platform, WebSocket },
  {
    route: 'Home',
    socket: {
      url: 'ws://127.0.0.1:17322/socket'
    }
  }
)

registerReactNativeUiCheckElement({
  ref: submitButtonRef,
  tag: 'Pressable',
  testID: 'submit-button',
  text: 'Submit'
})
```

Flutter client:

```sh
flutter pub add uicheck_flutter
```

```dart
import 'package:uicheck_flutter/uicheck_flutter.dart';

final client = installFlutterUiCheck(
  options: UiCheckFlutterOptions(
    title: 'Demo',
    route: '/home',
    socket: UiCheckSocketOptions(
      url: 'ws://127.0.0.1:17322/socket',
    ),
  ),
);

registerFlutterUiCheckElement(
  UiCheckFlutterElementRegistration(
    key: submitButtonKey,
    tag: 'ElevatedButton',
    testID: 'submit-button',
    text: 'Submit',
  ),
);
```

Android native client:

```txt
Android library: https://github.com/uicheck/uicheck
Path: packages/android
```

```kotlin
import ai.uicheck.android.UiCheckAndroidOptions
import ai.uicheck.android.UiCheckAndroidSocketOptions
import ai.uicheck.android.installAndroidUiCheck
import ai.uicheck.android.registerAndroidUiCheckView

val client = installAndroidUiCheck(
  UiCheckAndroidOptions(
    socket = UiCheckAndroidSocketOptions(
      url = "ws://127.0.0.1:17322/socket"
    ),
    title = "Demo",
    route = "/home",
    platform = "android"
  )
)

registerAndroidUiCheckView(
  submitButton,
  tag = "Button",
  testID = "submit-button",
  text = "Submit"
)
```

Apple native client:

```txt
Swift Package: https://github.com/uicheck/uicheck
Product: UICheckApple
Path: packages/apple
```

```swift
import UICheckApple

let client = installAppleUiCheck(
  options: UiCheckAppleOptions(
    socket: UiCheckAppleSocketOptions(
      url: "ws://127.0.0.1:17322/socket"
    ),
    title: "Demo",
    route: "/home",
    platform: "ios"
  )
)

registerAppleUiCheckView(
  submitButton,
  tag: "UIButton",
  testID: "submit-button",
  text: "Submit"
)
```

## MCP Tools

| Tool | Description |
| --- | --- |
| `list_clients` | Lists connected uicheck runtime clients |
| `capture_page` | Requests a PNG screenshot from a connected runtime |
| `inspect_elements` | Returns selectors or registered components, text, layout boxes, and metadata |
| `get_element_at_point` | Returns the element at viewport coordinates |

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Release

Use one unified tag to publish all public packages and create a combined GitHub Release:

```sh
git tag v0.1.4
git push origin v0.1.4
```
