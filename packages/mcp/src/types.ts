export interface UiCheckMcpServerOptions {
  host?: string
  port?: number
  mcpEndpoint?: string
  socketEndpoint?: string
  requestTimeoutMs?: number
}

export interface ResolvedUiCheckMcpServerOptions {
  host: string
  port: number
  mcpEndpoint: string
  socketEndpoint: string
  requestTimeoutMs: number
}

export interface UiCheckClientInfo {
  id: string
  userAgent?: string
  connectedAt: number
  lastSeenAt: number
  viewport?: {
    width: number
    height: number
    devicePixelRatio: number
    scrollX: number
    scrollY: number
  }
}

export interface UiCheckClientRequest {
  clientId?: string
  timeoutMs?: number
}

export interface CapturePageRequest extends UiCheckClientRequest {
  waitMs?: number
}

export interface InspectElementsRequest extends UiCheckClientRequest {
  limit?: number
  includeHidden?: boolean
  query?: string
  selector?: string
  styleName?: string
  styleValue?: string
  styles?: Record<string, string>
  id?: string
  testId?: string
  text?: string
  accessibilityLabel?: string
  className?: string
  role?: string
  tag?: string
}
