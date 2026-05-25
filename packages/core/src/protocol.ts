import type { UiCheckClientSnapshot, UiCheckSocketOptions, UiCheckToolAdapter } from './types'

interface SocketRequestMessage {
  type: 'request'
  id: string
  method: string
  params?: Record<string, unknown>
}

interface SocketResponseMessage {
  type: 'response'
  id: string
  result?: unknown
  error?: string
}

export interface UiCheckSocketTransport {
  send(message: string): void
  close(): void
  onOpen(listener: () => void): void
  onMessage(listener: (message: unknown) => void): void
  onClose(listener: () => void): void
}

export interface UiCheckRuntimeHooks {
  setTimeout(handler: () => void, timeout: number): unknown
  clearTimeout(timer: unknown): void
  onFocus?(listener: () => void): void
  onResize?(listener: () => void): void
  resolveSocketUrl?(url: string): string
}

export interface UiCheckRuntimeConnectionOptions {
  socket?: UiCheckSocketOptions
  adapter: UiCheckToolAdapter
  createTransport: (url: string) => UiCheckSocketTransport
  hooks: UiCheckRuntimeHooks
}

let runtimeCleanup: (() => void) | undefined

export function connectUiCheckRuntime(options: UiCheckRuntimeConnectionOptions): void {
  const socketConfig = options.socket
  if (!socketConfig || socketConfig.enabled === false || !socketConfig.url) return
  const rawSocketUrl = socketConfig.url

  runtimeCleanup?.()
  let socket: UiCheckSocketTransport | undefined
  let closed = false
  let reconnectTimer: unknown

  const buildInfo = () => ({
    type: 'hello',
    ...options.adapter.getClientInfo()
  })

  const send = (message: unknown) => {
    socket?.send(JSON.stringify(message))
  }

  const connect = () => {
    if (closed) return
    const resolvedSocketUrl = options.hooks.resolveSocketUrl?.(rawSocketUrl) ?? rawSocketUrl
    const socketUrl = appendClientId(resolvedSocketUrl, socketConfig.clientId)
    socket = options.createTransport(socketUrl)
    socket.onOpen(() => send(buildInfo()))
    socket.onMessage((message) => {
      void handleRuntimeMessage(options.adapter, message, send)
    })
    socket.onClose(() => {
      if (closed) return
      reconnectTimer = options.hooks.setTimeout(connect, socketConfig.reconnectMs ?? 1000)
    })
  }

  options.hooks.onFocus?.(() => send({ ...buildInfo(), type: 'update' }))
  options.hooks.onResize?.(() => send({ ...buildInfo(), type: 'update' }))
  connect()

  runtimeCleanup = () => {
    closed = true
    if (reconnectTimer !== undefined) options.hooks.clearTimeout(reconnectTimer)
    socket?.close()
  }
}

export async function handleRuntimeMessage(
  adapter: UiCheckToolAdapter,
  raw: unknown,
  send: (message: SocketResponseMessage) => void
): Promise<void> {
  let message: SocketRequestMessage
  try {
    message = JSON.parse(await normalizeSocketMessage(raw)) as SocketRequestMessage
  } catch {
    return
  }
  if (message.type !== 'request' || typeof message.id !== 'string') return

  try {
    const params = message.params ?? {}
    const result = await callAdapter(adapter, message.method, params)
    send({ type: 'response', id: message.id, result })
  } catch (error) {
    send({
      type: 'response',
      id: message.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

async function normalizeSocketMessage(raw: unknown): Promise<string> {
  if (typeof raw === 'string') return raw
  if (raw instanceof ArrayBuffer) return decodeArrayBuffer(raw)
  if (ArrayBuffer.isView(raw)) return decodeBytes(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength))
  if (raw && typeof raw === 'object' && typeof (raw as { text?: unknown }).text === 'function') {
    return String(await (raw as { text: () => Promise<unknown> }).text())
  }
  if (raw && typeof raw === 'object' && Object.prototype.toString.call(raw) === '[object ArrayBuffer]') {
    return decodeArrayBuffer(raw as ArrayBuffer)
  }
  return String(raw)
}

function decodeArrayBuffer(buffer: ArrayBuffer): string {
  return decodeBytes(new Uint8Array(buffer))
}

function decodeBytes(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes)
  return String.fromCharCode(...bytes)
}

function callAdapter(adapter: UiCheckToolAdapter, method: string, params: Record<string, unknown>): Promise<unknown> | unknown {
  if (method === 'capture_page') return adapter.capturePage(params)
  if (method === 'capture_element') {
    if (adapter.captureElement) return adapter.captureElement(params)
    return adapter.capturePage(params)
  }
  if (method === 'inspect_elements') return adapter.inspectElements(params)
  throw new Error(`Unknown uicheck method: ${method}`)
}

function appendClientId(rawUrl: string, clientId: string | undefined): string {
  if (!clientId) return rawUrl
  const joiner = rawUrl.includes('?') ? '&' : '?'
  return `${rawUrl}${joiner}clientId=${encodeURIComponent(clientId)}`
}

export function emptySnapshot(): UiCheckClientSnapshot {
  return {
    viewport: {
      width: 0,
      height: 0,
      devicePixelRatio: 1,
      scrollX: 0,
      scrollY: 0
    }
  }
}
