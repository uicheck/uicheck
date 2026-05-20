import type { UiCheckScreenshotResult, UiCheckSocketOptions } from '@uicheck/core'

export interface UiCheckOptions {
  /** 连接 @uicheck/mcp 的 WebSocket 配置 */
  socket?: UiCheckSocketOptions
  /** 自定义截图实现；未传时使用 html2canvas */
  screenshot?(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
}

export type ResolvedUiCheckOptions = UiCheckOptions
