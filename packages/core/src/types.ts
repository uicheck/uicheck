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

export interface UiCheckViewportInfo {
  width: number
  height: number
  devicePixelRatio: number
  scrollX: number
  scrollY: number
}

export interface UiCheckClientSnapshot {
  userAgent?: string
  viewport: UiCheckViewportInfo
}

export interface UiCheckScreenshotResult {
  width?: number
  height?: number
  mimeType: string
  base64: string
}

export interface UiCheckToolAdapter {
  getClientInfo(): UiCheckClientSnapshot
  capturePage(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
  captureElement?(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
  inspectElements(params?: Record<string, unknown>): Promise<Record<string, unknown>> | Record<string, unknown>
}
