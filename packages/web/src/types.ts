import type { UiCheckSocketOptions } from '@uicheck/core'

export interface UiCheckOptions {
  /** 悬浮球显示位置，默认 'bottom-left' */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** 悬浮球初始偏移量（px），默认 [20, 20] */
  offset?: [number, number]
  /** 悬浮球大小（px），默认 36 */
  size?: number
  /** 悬浮球背景色，默认 '#ef4444' */
  color?: string
  /** 启用拖拽，默认 true */
  draggable?: boolean
  /** 连接 @uicheck/mcp 的 WebSocket 配置 */
  socket?: UiCheckSocketOptions
}

export type ResolvedUiCheckOptions = Required<Omit<UiCheckOptions, 'socket'>> & {
  socket?: UiCheckSocketOptions
}
