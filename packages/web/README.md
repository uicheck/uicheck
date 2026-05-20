# @uicheck/web

Browser runtime client for UI Check. It connects a live DOM page to `@uicheck/mcp` over WebSocket so AI agents can request screenshots, element metadata, layout boxes through MCP tools.

## Usage

```ts
import { initUiCheck } from '@uicheck/web'

initUiCheck({
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `socket.url` | `string` | - | `@uicheck/mcp` WebSocket URL |
| `socket.clientId` | `string` | - | Optional stable client id |
| `socket.reconnectMs` | `number` | `1000` | Reconnect interval |
