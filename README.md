<p align="center">
  <img src=".github/assets/uicheck-logo.svg" width="96" height="96" alt="UI Check logo" />
</p>

# UI Check

AI-readable UI inspection for browser, React Native, and Taro Mini Program pages.

UI Check connects live pages to AI agents through MCP. It exposes screenshots, element metadata, layout boxes, coordinates, and manual visual annotations so AI can debug UI issues against the real page instead of guessing from code alone.

Website: https://uicheck.ai

GitHub: https://github.com/uicheck/uicheck

## Packages

| Package | Description |
| --- | --- |
| `@uicheck/core` | Shared WebSocket protocol runtime and types |
| `@uicheck/web` | Browser DOM client with floating checker, screenshot, element inspection, and CDN bundle |
| `@uicheck/rn` | React Native client using registered refs for element inspection |
| `@uicheck/taro` | Taro Mini Program client using selector query inspection |
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
  position: 'bottom-left',
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

## MCP Tools

| Tool | Description |
| --- | --- |
| `list_clients` | Lists connected uicheck clients |
| `capture_page` | Requests a PNG screenshot from a connected page |
| `inspect_elements` | Returns selectors, text, layout boxes, spacing, and metadata |
| `get_element_at_point` | Returns the element and ancestors at viewport coordinates |

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
git tag v0.1.3
git push origin v0.1.3
```
