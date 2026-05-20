import { createServer } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { UiCheckMcpServer, resolveOptions } from './mcp'

const servers: UiCheckMcpServer[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

describe('resolveOptions', () => {
  it('applies defaults and normalizes endpoints', () => {
    expect(resolveOptions({ mcpEndpoint: 'mcp', socketEndpoint: 'socket' })).toEqual({
      host: '127.0.0.1',
      port: 17322,
      mcpEndpoint: '/mcp',
      socketEndpoint: '/socket',
      requestTimeoutMs: 30_000
    })
  })

  it('keeps explicit options', () => {
    expect(
      resolveOptions({
        host: '0.0.0.0',
        port: 18000,
        mcpEndpoint: '/api/mcp',
        socketEndpoint: '/api/socket',
        requestTimeoutMs: 5000
      })
    ).toEqual({
      host: '0.0.0.0',
      port: 18000,
      mcpEndpoint: '/api/mcp',
      socketEndpoint: '/api/socket',
      requestTimeoutMs: 5000
    })
  })
})

describe('UiCheckMcpServer', () => {
  it('serves health and lists connected socket clients', async () => {
    const port = await getFreePort()
    const server = new UiCheckMcpServer({ port })
    servers.push(server)
    await server.listen()

    const socket = new WebSocket(`ws://127.0.0.1:${port}/socket?clientId=page-a`)
    const helloPromise = waitForSocketMessage(socket)
    try {
      await waitForSocketOpen(socket)
      const hello = await helloPromise
      expect(JSON.parse(hello)).toEqual({ type: 'hello', clientId: 'page-a' })

      socket.send(
        JSON.stringify({
          type: 'update',
          userAgent: 'vitest',
          viewport: {
            width: 1280,
            height: 720,
            devicePixelRatio: 2,
            scrollX: 3,
            scrollY: 5
          }
        })
      )

      await waitFor(() => serverHealth(port).then((health) => health.clients.length === 1 && health.clients[0].userAgent === 'vitest'))
      const health = await serverHealth(port)

      expect(health.ok).toBe(true)
      expect(health.mcp).toBe(`http://127.0.0.1:${port}/mcp`)
      expect(health.socket).toBe(`ws://127.0.0.1:${port}/socket`)
      expect(health.clients[0]).toMatchObject({
        id: 'page-a',
        userAgent: 'vitest',
        viewport: {
          width: 1280,
          height: 720,
          devicePixelRatio: 2,
          scrollX: 3,
          scrollY: 5
        }
      })
    } finally {
      socket.close()
    }
  })
})

async function getFreePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  if (!address || typeof address === 'string') throw new Error('Unable to allocate test port')
  return address.port
}

function waitForSocketOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })
}

function waitForSocketMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('message', (raw) => resolve(raw.toString()))
    socket.once('error', reject)
  })
}

async function serverHealth(port: number): Promise<{
  ok: boolean
  mcp: string
  socket: string
  clients: Array<Record<string, unknown>>
}> {
  const response = await fetch(`http://127.0.0.1:${port}/health`)
  expect(response.status).toBe(200)
  return (await response.json()) as {
    ok: boolean
    mcp: string
    socket: string
    clients: Array<Record<string, unknown>>
  }
}

async function waitFor(predicate: () => Promise<boolean>): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 1000) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for condition')
}
