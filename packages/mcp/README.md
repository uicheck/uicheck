# @uicheck/mcp

Local MCP server for uicheck clients. Runtime clients connect to this server through WebSocket, and AI agents call MCP tools to request screenshots and tree-shaped element info from Web, Taro, React Native, Flutter, Apple native, or Android native apps.

## Start

```sh
npx @uicheck/mcp
```

Default endpoints:

```txt
MCP:    http://127.0.0.1:17322/mcp
Socket: ws://127.0.0.1:17322/socket
```

## AI Client Setup

Add the MCP endpoint to any MCP-capable AI client:

```json
{
  "mcpServers": {
    "uicheck": {
      "url": "http://127.0.0.1:17322/mcp"
    }
  }
}
```

## Runtime Clients

Connect the app runtime to the socket URL. Browser pages use `@uicheck/web`:

```ts
initUiCheck({
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```

Use `@uicheck/taro` for Taro Mini Program pages, `@uicheck/rn` for React Native screens, `uicheck_flutter` for Flutter apps, `uicheck_apple` for Apple native apps, and `uicheck_android` for Android native apps.

## MCP Tools

| Tool | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `list_clients` | Lists connected uicheck runtime clients. | None | JSON text array. Each item includes `id`, `connectedAt`, `lastSeenAt`, plus optional `userAgent` and `viewport`. |
| `capture_page` | Asks a connected runtime to return a PNG screenshot. | `clientId` optional target client id; `timeoutMs` MCP wait timeout; `waitMs` extra wait before capture; `captureTimeoutMs` runtime screenshot timeout; `forceHtml2Canvas` forces the Web client to use html2canvas. | MCP image content with `image/png`; plus JSON text `{ width, height }`. |
| `inspect_elements` | Returns tree-shaped nodes, text, layout boxes, and metadata. When search parameters are provided, the result keeps only matching nodes and their parent tree. | `clientId` optional target client id; `timeoutMs` MCP wait timeout; `limit` maximum nodes, default 80; `includeHidden` includes hidden or zero-size nodes; `query` searches common node fields; `selector`, `styleName` plus optional `styleValue`, `styles`, `id`, `testId`, `text`, `accessibilityLabel`, `className`, `role`, and `tag` narrow matches. | JSON text. Includes `count` and tree-shaped `tree`; nodes include runtime-provided text, visibility, layout boxes, test IDs, accessibility labels, classes, and children. |

## CLI

```sh
npx @uicheck/mcp -- --host 127.0.0.1 --port 17322
```
