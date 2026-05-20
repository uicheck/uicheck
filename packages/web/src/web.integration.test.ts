import { createServer } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { UiCheckMcpServer } from '@uicheck/mcp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { initUiCheck } from './web'
import type { ResolvedUiCheckOptions } from './types'

const servers: UiCheckMcpServer[] = []
const clients: Client[] = []

afterEach(async () => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

describe('web client integration', () => {
  it('connects to MCP over WebSocket and serves real DOM inspect/capture requests', async () => {
    const port = await getFreePort()
    const server = new UiCheckMcpServer({ port })
    servers.push(server)
    await server.listen()
    vi.stubGlobal('WebSocket', WebSocket)
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: true,
      value: WebSocket
    })

    document.title = 'Web integration'
    document.body.innerHTML = '<main id="app"><button id="submit" data-testid="submit-button">Submit</button></main>'
    setRect(document.getElementById('app'), { x: 0, y: 0, width: 240, height: 120 })
    setRect(document.getElementById('submit'), { x: 20, y: 16, width: 100, height: 32 })

    initUiCheck({
      ...baseConfig,
      socket: {
        url: server.socketUrl,
        clientId: 'web-real'
      },
      screenshot: () => ({
        width: 320,
        height: 180,
        mimeType: 'image/png',
        base64: 'ZmFrZS1wbmc='
      })
    })

    await waitForClient(server, 'web-real')
    const client = new Client({ name: 'web-vitest', version: '0.0.0' })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(server.mcpUrl)))

    const inspected = await client.callTool({
      name: 'inspect_elements',
      arguments: { clientId: 'web-real', limit: 10 }
    })
    const inspectPayload = getJsonToolPayload(inspected)
    expect(inspectPayload).toMatchObject({
      count: 2,
      tree: [
        {
          tag: 'main',
          id: 'app',
          children: [
            {
              tag: 'button',
              text: 'Submit',
              testId: 'submit-button',
              visible: true,
              box: { x: 20, y: 16, width: 100, height: 32 }
            }
          ]
        }
      ]
    })

    const captured = await client.callTool({
      name: 'capture_page',
      arguments: { clientId: 'web-real', forceHtml2Canvas: true }
    })
    const image = getToolContent(captured).find((item) => item.type === 'image')
    const metadata = getJsonToolPayload(captured)
    expect(image).toMatchObject({ type: 'image', mimeType: 'image/png', data: 'ZmFrZS1wbmc=' })
    expect(metadata).toMatchObject({ width: 320, height: 180 })
  })
})

const baseConfig: ResolvedUiCheckOptions = {}

function setRect(element: Element | null, rect: { x: number; y: number; width: number; height: number }) {
  if (!element) throw new Error('Missing test element')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    ...rect,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    toJSON: () => rect
  } as DOMRect)
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
