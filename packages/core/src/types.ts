export interface UiCheckOptions {
  /** 悬浮球显示位置，默认 'bottom-right' */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** 悬浮球初始偏移量（px），默认 [20, 20] */
  offset?: [number, number]
  /** 悬浮球大小（px），默认 40 */
  size?: number
  /** 悬浮球背景色，默认 '#4f46e5' */
  color?: string
  /** 启用拖拽，默认 true */
  draggable?: boolean
  /** 连接 @uicheck/mcp 的 WebSocket 配置 */
  socket?: UiCheckSocketOptions
}

export interface UiCheckSocketOptions {
  /** WebSocket 地址，例如 ws://127.0.0.1:17322/socket */
  url?: string
  /** 页面客户端 ID，默认由 mcp 服务分配 */
  clientId?: string
  /** 断线重连间隔（ms），默认 1000 */
  reconnectMs?: number
  /** 是否启用 socket，默认 true */
  enabled?: boolean
}

export type ResolvedUiCheckOptions = Required<Omit<UiCheckOptions, 'socket'>> & {
  socket?: UiCheckSocketOptions
}
