import { createServer } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { UiCheckMcpServer } from './mcp'

const servers: UiCheckMcpServer[] = []
const sockets: WebSocket[] = []
const clients: Client[] = []

afterEach(async () => {
  sockets.splice(0).forEach((socket) => socket.close())
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

describe('MCP tool integration', () => {
  it('routes MCP tool calls to a connected real WebSocket client', async () => {
    const port = await getFreePort()
    const server = new UiCheckMcpServer({ port })
    servers.push(server)
    await server.listen()

    const socket = new WebSocket(`ws://127.0.0.1:${port}/socket?clientId=page-a`)
    sockets.push(socket)
    await waitForSocketOpen(socket)
    socket.send(
      JSON.stringify({
        type: 'update',
        url: 'http://localhost:3000/',
        title: 'Integration page',
        viewport: { width: 800, height: 600, devicePixelRatio: 1, scrollX: 0, scrollY: 0 }
      })
    )

    const client = new Client({ name: 'uicheck-vitest', version: '0.0.0' })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(server.mcpUrl)))

    const requestPromise = waitForSocketMessage(socket)
    const toolPromise = client.callTool({
      name: 'inspect_elements',
      arguments: {
        clientId: 'page-a',
        selector: '#submit',
        text: 'Submit',
        styleName: 'color',
        styleValue: '255, 0, 0',
        styles: { display: 'block' }
      }
    })
    const request = JSON.parse(await requestPromise) as { id: string; method: string; params: Record<string, unknown> }
    expect(request).toMatchObject({
      method: 'inspect_elements',
      params: {
        selector: '#submit',
        text: 'Submit',
        styleName: 'color',
        styleValue: '255, 0, 0',
        styles: { display: 'block' }
      }
    })

    socket.send(
      JSON.stringify({
        type: 'response',
        id: request.id,
        result: {
          count: 1,
          tree: [{ id: 'submit', text: 'Submit', children: [] }]
        }
      })
    )

    const response = await toolPromise
    expect(response.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(
          {
            count: 1,
            tree: [{ id: 'submit', text: 'Submit', children: [] }]
          },
          null,
          2
        )
      }
    ])
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
