# @uicheck/rn

React Native client for uicheck. It instruments React / JSX creation during `initUiCheck` so AI agents can inspect runtime element boxes, text, `testID`, and accessibility labels through `@uicheck/mcp`.

```ts
import { initUiCheck } from '@uicheck/rn'

initUiCheck({
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```

## Screenshot

React Native screenshots depend on the host app. To support `capture_page`, pass a `screenshot` function that returns PNG base64.

```ts
initUiCheck({
  screenshot: async () => ({
    mimeType: 'image/png',
    base64: await captureAppAsBase64()
  })
})
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `socket.url` | `string` | - | `@uicheck/mcp` WebSocket URL |
| `socket.clientId` | `string` | - | Optional stable client id |
| `socket.reconnectMs` | `number` | `1000` | Reconnect interval |
| `screenshot` | `function` | - | Optional screenshot function that returns PNG base64 |
