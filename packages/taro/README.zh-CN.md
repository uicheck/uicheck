# @uicheck/taro

Taro 小程序侧 UI 检查客户端。它通过小程序 selector query 读取页面元素，并连接 `@uicheck/mcp` 给 AI 提供结构化 UI 信息。

```ts
import { initUiCheck } from '@uicheck/taro'

initUiCheck({
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
| `screenshot` | `function` | - | 可选截图函数，返回 PNG base64 |
