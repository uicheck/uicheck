import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import type { ResolvedUiCheckMcpServerOptions, UiCheckClientInfo } from './types'

interface ClientState {
  socket: WebSocket
  info: UiCheckClientInfo
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

export class UiCheckSocketHub {
  private readonly socketServer: WebSocketServer
  private readonly clients = new Map<string, ClientState>()
  private readonly pending = new Map<string, PendingRequest>()

  constructor(private readonly options: ResolvedUiCheckMcpServerOptions) {
    this.socketServer = new WebSocketServer({ noServer: true })
    this.socketServer.on('connection', (socket, request) => this.register(socket, request))
  }

  handleUpgrade(request: IncomingMessage, socket: Parameters<WebSocketServer['handleUpgrade']>[1], head: Buffer): boolean {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${this.options.host}:${this.options.port}`}`)
    if (url.pathname !== this.options.socketEndpoint) return false

    this.socketServer.handleUpgrade(request, socket, head, (webSocket) => {
      this.socketServer.emit('connection', webSocket, request)
    })
    return true
  }

  close(): Promise<void> {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('uicheck-mcp server is closing'))
    }
    this.pending.clear()

    for (const client of this.clients.values()) {
      client.socket.close()
    }
    this.clients.clear()

    return new Promise((resolve) => this.socketServer.close(() => resolve()))
  }

  listClients(): UiCheckClientInfo[] {
    return Array.from(this.clients.values()).map((client) => client.info)
  }

  request(method: string, params: Record<string, unknown>, clientId?: string, timeoutMs = this.options.requestTimeoutMs): Promise<unknown> {
    const client = this.pickClient(clientId)
    if (!client) {
      throw new Error(clientId ? `uicheck client not connected: ${clientId}` : 'No uicheck client is connected')
    }

    const id = randomUUID()
    const message = {
      type: 'request',
      id,
      method,
      params
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`uicheck client request timed out: ${method}`))
      }, timeoutMs)

      this.pending.set(id, { resolve, reject, timeout })
      client.socket.send(JSON.stringify(message), (error) => {
        if (!error) return
        clearTimeout(timeout)
        this.pending.delete(id)
        reject(error)
      })
    })
  }

  private register(socket: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${this.options.host}:${this.options.port}`}`)
    const requestedId = url.searchParams.get('clientId')?.trim()
    const id = requestedId || randomUUID()
    const now = Date.now()

    const existing = this.clients.get(id)
    existing?.socket.close()

    const state: ClientState = {
      socket,
      info: {
        id,
        connectedAt: now,
        lastSeenAt: now
      }
    }
    this.clients.set(id, state)

    socket.on('message', (raw) => this.handleMessage(id, raw.toString()))
    socket.on('close', () => {
      if (this.clients.get(id)?.socket === socket) {
        this.clients.delete(id)
      }
    })
    socket.on('error', () => {
      if (this.clients.get(id)?.socket === socket) {
        this.clients.delete(id)
      }
    })

    socket.send(JSON.stringify({ type: 'hello', clientId: id }))
  }

  private handleMessage(clientId: string, raw: string): void {
    const client = this.clients.get(clientId)
    if (!client) return
    client.info.lastSeenAt = Date.now()

    let message: unknown
    try {
      message = JSON.parse(raw)
    } catch {
      return
    }

    if (!isObject(message)) return

    if (message.type === 'hello' || message.type === 'update') {
      client.info = {
        ...client.info,
        ...pickClientInfo(message),
        id: client.info.id,
        lastSeenAt: Date.now()
      }
      return
    }

    if (message.type !== 'response' || typeof message.id !== 'string') return

    const pending = this.pending.get(message.id)
    if (!pending) return
    clearTimeout(pending.timeout)
    this.pending.delete(message.id)

    if (typeof message.error === 'string' && message.error) {
      pending.reject(new Error(message.error))
      return
    }
    pending.resolve(message.result)
  }

  private pickClient(clientId?: string): ClientState | undefined {
    if (clientId) return this.clients.get(clientId)
    return this.clients.values().next().value
  }
}

function pickClientInfo(value: Record<string, unknown>): Partial<UiCheckClientInfo> {
  const result: Partial<UiCheckClientInfo> = {}
  if (typeof value.url === 'string') result.url = value.url
  if (typeof value.title === 'string') result.title = value.title
  if (typeof value.userAgent === 'string') result.userAgent = value.userAgent
  if (isObject(value.viewport)) {
    result.viewport = {
      width: Number(value.viewport.width) || 0,
      height: Number(value.viewport.height) || 0,
      devicePixelRatio: Number(value.viewport.devicePixelRatio) || 1,
      scrollX: Number(value.viewport.scrollX) || 0,
      scrollY: Number(value.viewport.scrollY) || 0
    }
  }
  return result
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
