import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { UiCheckSocketHub } from './socket-hub'
import type { ResolvedUiCheckMcpServerOptions } from './types'

const cleanupTasks: Array<() => Promise<void>> = []

afterEach(async () => {
  await Promise.all(cleanupTasks.splice(0).map((cleanup) => cleanup()))
})

describe('UiCheckSocketHub', () => {
  it('routes requests to the selected client and resolves responses', async () => {
    const { hub, server, port } = await startHub()
    const socket = new WebSocket(`ws://127.0.0.1:${port}/socket?clientId=page-a`)
    const helloPromise = waitForSocketMessage(socket)
    await waitForSocketOpen(socket)
    await helloPromise

    const requestMessagePromise = waitForSocketMessage(socket)
    const requestPromise = hub.request('inspect_elements', { selector: '#app' }, 'page-a', 1000)
    const request = JSON.parse(await requestMessagePromise)
    expect(request).toMatchObject({
      type: 'request',
      method: 'inspect_elements',
      params: { selector: '#app' }
    })

    socket.send(
      JSON.stringify({
        type: 'response',
        id: request.id,
        result: { count: 1, tree: [{ selector: '#app', children: [] }] }
      })
    )

    await expect(requestPromise).resolves.toEqual({ count: 1, tree: [{ selector: '#app', children: [] }] })
    socket.close()
    await closeHub(hub, server)
  })

  it('rejects when no requested client is connected', async () => {
    const { hub, server } = await startHub()

    expect(() => hub.request('capture_page', {}, 'missing-client')).toThrow('uicheck client not connected: missing-client')
    await closeHub(hub, server)
  })
})

async function startHub(): Promise<{ hub: UiCheckSocketHub; server: Server; port: number }> {
  const options: ResolvedUiCheckMcpServerOptions = {
    host: '127.0.0.1',
    port: 0,
    mcpEndpoint: '/mcp',
    socketEndpoint: '/socket',
    requestTimeoutMs: 1000
  }
  const hub = new UiCheckSocketHub(options)
  const server = createServer()
  server.on('upgrade', (request, socket, head) => {
    if (!hub.handleUpgrade(request, socket, head)) socket.destroy()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to allocate test port')

  cleanupTasks.push(() => closeHub(hub, server))
  return { hub, server, port: address.port }
}

async function closeHub(hub: UiCheckSocketHub, server: Server): Promise<void> {
  await hub.close().catch(() => undefined)
  await new Promise<void>((resolve) => server.close(() => resolve())).catch(() => undefined)
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
