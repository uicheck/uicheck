import { createServer } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { UiCheckMcpServer } from '@uicheck/mcp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  initUiCheck,
  type ReactNativeUiCheckOptions,
  type ReactNativeLike,
  type ReactNativeReactLike,
  type ReactNativeWebSocketLike
} from './react-native'

const servers: UiCheckMcpServer[] = []
const clients: Client[] = []
const cleanups: Array<() => void> = []

afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

describe('react-native client integration', () => {
  it('connects to MCP and serves registered element inspect/capture requests', async () => {
    const port = await getFreePort()
    const server = new UiCheckMcpServer({ port })
    servers.push(server)
    await server.listen()

    const React = createReact()
    const screenshot = vi.fn(() => ({
      mimeType: 'image/png',
      base64: 'cm4tcG5n'
    }))
    initUiCheck({
      ...createReactNative(),
      React,
      socket: {
        url: server.socketUrl,
        clientId: 'rn-real'
      },
      screenshot
    } as ReactNativeUiCheckOptions)
    const element = React.createElement('Pressable', {
      testID: 'submit-button',
      accessibilityLabel: 'Submit order',
      children: 'Submit'
    }) as { props: { ref: (value: unknown) => void } }
    element.props.ref({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => {
        callback(12, 24, 120, 44)
      }
    })
    cleanups.push(() => element.props.ref(null))

    await waitForClient(server, 'rn-real')
    const client = new Client({ name: 'rn-vitest', version: '0.0.0' })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(server.mcpUrl)))

    const inspected = await client.callTool({
      name: 'inspect_elements',
      arguments: { clientId: 'rn-real', limit: 10 }
    })
    expect(getJsonToolPayload(inspected)).toMatchObject({
      platform: 'react-native',
      os: 'ios',
      count: 1,
      tree: [
        {
          tag: 'Pressable',
          testID: 'submit-button',
          accessibilityLabel: 'Submit order',
          text: 'Submit order',
          visible: true,
          box: { x: 12, y: 24, width: 120, height: 44 },
        }
      ]
    })

    const captured = await client.callTool({
      name: 'capture_page',
      arguments: { clientId: 'rn-real' }
    })
    expect(getToolContent(captured).find((item) => item.type === 'image')).toMatchObject({
      type: 'image',
      mimeType: 'image/png',
      data: 'cm4tcG5n'
    })

    const capturedElement = await client.callTool({
      name: 'capture_element',
      arguments: { clientId: 'rn-real', testId: 'submit-button' }
    })
    expect(getToolContent(capturedElement).find((item) => item.type === 'image')).toMatchObject({
      type: 'image',
      mimeType: 'image/png',
      data: 'cm4tcG5n'
    })
    expect(screenshot).toHaveBeenLastCalledWith({ testId: 'submit-button' })
  })
})

function createReactNative(): ReactNativeLike {
  return {
    Dimensions: {
      get: () => ({ width: 390, height: 844, scale: 3 }),
      addEventListener: () => ({ remove: () => undefined })
    },
    Platform: { OS: 'ios' },
    AppState: {
      addEventListener: () => ({ remove: () => undefined })
    },
    WebSocket: TestWebSocket
  }
}

function createReact(): ReactNativeReactLike {
  return {
    createElement: (type, props, ...children) => ({
      type,
      props: {
        ...props,
        children: children.length > 0 ? children : props?.children
      }
    })
  }
}

class TestWebSocket implements ReactNativeWebSocketLike {
  private readonly socket: WebSocket

  onopen?: () => void
  onmessage?: (event: { data?: unknown } | unknown) => void
  onclose?: () => void
  onerror?: (error?: unknown) => void

  constructor(url: string) {
    this.socket = new WebSocket(url)
    this.socket.addEventListener('open', () => this.onopen?.())
    this.socket.addEventListener('message', (event) => this.onmessage?.({ data: event.data }))
    this.socket.addEventListener('close', () => this.onclose?.())
    this.socket.addEventListener('error', (event) => this.onerror?.(event))
  }

  send(message: string): void {
    this.socket.send(message)
  }

  close(): void {
    this.socket.close()
  }

  addEventListener(event: 'open' | 'message' | 'close' | 'error', listener: (event?: unknown) => void): void {
    this.socket.addEventListener(event, listener as EventListener)
  }

  removeEventListener(event: 'open' | 'message' | 'close' | 'error', listener: (event?: unknown) => void): void {
    this.socket.removeEventListener(event, listener as EventListener)
  }
}

async function getFreePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  if (!address || typeof address === 'string') throw new Error('Unable to allocate test port')
  return address.port
}

async function waitForClient(server: UiCheckMcpServer, clientId: string): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 1500) {
    const response = await fetch(server.mcpUrl.replace('/mcp', '/health'))
    const health = (await response.json()) as { clients: Array<{ id: string }> }
    if (health.clients.some((client) => client.id === clientId)) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Timed out waiting for ${clientId}`)
}

function getToolContent(response: unknown): Array<{ type: string; text?: string; mimeType?: string; data?: string }> {
  if (!response || typeof response !== 'object' || !('content' in response) || !Array.isArray(response.content)) {
    throw new Error('Missing tool response content')
  }
  return response.content as Array<{ type: string; text?: string; mimeType?: string; data?: string }>
}

function getJsonToolPayload(response: unknown): Record<string, unknown> {
  const text = getToolContent(response).find((item) => item.type === 'text')?.text
  if (!text) throw new Error('Missing text tool response')
  return JSON.parse(text) as Record<string, unknown>
}
