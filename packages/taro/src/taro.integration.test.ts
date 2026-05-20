import { createServer } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { UiCheckMcpServer } from '@uicheck/mcp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initUiCheck, type TaroLike, type TaroSelectorQueryNode, type TaroSocketTask } from './taro'

const servers: UiCheckMcpServer[] = []
const clients: Client[] = []

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

describe('taro client integration', () => {
  it('connects to MCP and serves selector query inspect/capture requests', async () => {
    const port = await getFreePort()
    const server = new UiCheckMcpServer({ port })
    servers.push(server)
    await server.listen()

    const taro = createTaro([
      {
        id: 'submit',
        className: 'primary button',
        dataset: { uicheckTag: 'button', text: '提交' },
        left: 10,
        top: 20,
        width: 88,
        height: 32
      }
    ])
    initUiCheck({
      taro,
      socket: {
        url: server.socketUrl,
        clientId: 'taro-real'
      },
      screenshot: () => ({
        mimeType: 'image/png',
        base64: 'dGFyby1wbmc='
      })
    })

    await waitForClient(server, 'taro-real')
    const client = new Client({ name: 'taro-vitest', version: '0.0.0' })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(server.mcpUrl)))

    const inspected = await client.callTool({
      name: 'inspect_elements',
      arguments: { clientId: 'taro-real', limit: 10 }
    })
    expect(getJsonToolPayload(inspected)).toMatchObject({
      platform: 'taro',
      count: 1,
      tree: [
        {
          tag: 'button',
          text: '提交',
          visible: true,
          box: { x: 10, y: 20, width: 88, height: 32 }
        }
      ]
    })

    const captured = await client.callTool({
      name: 'capture_page',
      arguments: { clientId: 'taro-real' }
    })
    expect(getToolContent(captured).find((item) => item.type === 'image')).toMatchObject({
      type: 'image',
      mimeType: 'image/png',
      data: 'dGFyby1wbmc='
    })
  })
})

function createTaro(nodes: TaroSelectorQueryNode[]): TaroLike {
  return {
    connectSocket: ({ url }) => createSocketTask(url),
    createSelectorQuery: () => {
      const query = {
        selectAll: vi.fn(() => ({
          fields: vi.fn((_fields, callback) => {
            callback(nodes)
            return query
          }),
          boundingClientRect: vi.fn((callback) => {
            callback(nodes)
            return query
          })
        })),
        selectViewport: vi.fn(() => ({
          scrollOffset: vi.fn((callback) => {
            callback({ scrollLeft: 3, scrollTop: 5 })
            return query
          })
        })),
        exec: vi.fn((callback?: () => void) => callback?.())
      }
      return query
    },
    getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3 })
  }
}

function createSocketTask(url: string): TaroSocketTask {
  const socket = new WebSocket(url)
  return {
    send: ({ data }) => socket.send(data),
    close: () => socket.close(),
    onOpen: (listener) => socket.addEventListener('open', () => listener()),
    onMessage: (listener) => socket.addEventListener('message', (event) => listener({ data: event.data })),
    onClose: (listener) => socket.addEventListener('close', () => listener())
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
