# @uicheck/web

浏览器运行环境客户端。它通过 WebSocket 把真实 DOM 页面连接到 `@uicheck/mcp`，让 AI 可以通过 MCP 工具读取截图、元素元数据、布局盒和坐标。

## 使用

```ts
import html2canvas from 'html2canvas'
import { installUiCheck } from '@uicheck/web'

installUiCheck(html2canvas, {
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})
```

## 选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `socket.url` | `string` | - | `@uicheck/mcp` WebSocket 地址 |
| `socket.clientId` | `string` | - | 可选的稳定客户端 ID |
| `socket.reconnectMs` | `number` | `1000` | 断线重连间隔 |
