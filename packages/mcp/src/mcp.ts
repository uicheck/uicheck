import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import * as z from 'zod/v4'
import { comparePngScreenshots } from './image-compare'
import { UiCheckSocketHub } from './socket-hub'
import type { ResolvedUiCheckMcpServerOptions, UiCheckMcpServerOptions } from './types'

export class UiCheckMcpServer {
  private readonly options: ResolvedUiCheckMcpServerOptions
  private readonly hub: UiCheckSocketHub
  private httpServer?: HttpServer

  constructor(options: UiCheckMcpServerOptions = {}) {
    this.options = resolveOptions(options)
    this.hub = new UiCheckSocketHub(this.options)
  }

  async listen(): Promise<void> {
    if (this.httpServer) return

    this.httpServer = createServer((request, response) => {
      void this.handleHttpRequest(request, response)
    })

    this.httpServer.on('upgrade', (request, socket, head) => {
      const handled = this.hub.handleUpgrade(request, socket, head)
      if (!handled) socket.destroy()
    })

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.once('error', reject)
      this.httpServer?.listen(this.options.port, this.options.host, () => {
        this.httpServer?.off('error', reject)
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    await this.hub.close()
    if (!this.httpServer) return

    const server = this.httpServer
    this.httpServer = undefined
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  get mcpUrl(): string {
    return `http://${this.options.host}:${this.options.port}${this.options.mcpEndpoint}`
  }

  get socketUrl(): string {
    return `ws://${this.options.host}:${this.options.port}${this.options.socketEndpoint}`
  }

  private async handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${this.options.host}:${this.options.port}`}`)
    setCorsHeaders(response)

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    if (url.pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(
        JSON.stringify({
          ok: true,
          mcp: this.mcpUrl,
          socket: this.socketUrl,
          clients: this.hub.listClients()
        })
      )
      return
    }

    if (url.pathname !== this.options.mcpEndpoint) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
      return
    }

    if (request.method !== 'POST') {
      response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Method not allowed. Use POST for this stateless MCP endpoint.' },
          id: null
        })
      )
      return
    }

    const mcpServer = this.createMcpServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    })

    try {
      await mcpServer.connect(transport)
      await transport.handleRequest(request, response)
      response.on('close', () => {
        void transport.close()
        void mcpServer.close()
      })
    } catch (error) {
      await transport.close().catch(() => undefined)
      await mcpServer.close().catch(() => undefined)
      if (!response.headersSent) {
        response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        response.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal server error'
            },
            id: null
          })
        )
      }
    }
  }

  private createMcpServer(): McpServer {
    const server = new McpServer({
      name: 'uicheck-mcp',
      version: '0.1.8'
    })

    const clientArgs = {
      clientId: z.string().optional().describe('Target uicheck socket client id. Defaults to the first connected client.'),
      timeoutMs: z.number().int().min(500).max(120_000).optional().describe('Request timeout. Defaults to the server timeout.')
    }
    const captureArgs = {
      waitMs: z.number().int().min(0).max(30_000).optional().describe('Extra wait time before capture.'),
      captureTimeoutMs: z
        .number()
        .int()
        .min(500)
        .max(120_000)
        .optional()
        .describe('Runtime-side screenshot timeout. Defaults to 10000.'),
      forceHtml2Canvas: z
        .boolean()
        .optional()
        .describe('Force html2canvas capture in environments where it is normally skipped, such as Electron.')
    }
    const elementSearchArgs = {
      includeHidden: z.boolean().optional().describe('Include hidden or zero-size elements. Defaults to false.'),
      query: z.string().optional().describe('Search across id, test id, text, accessibility label, role, tag, href, and classes.'),
      selector: z.string().optional().describe('Find nodes by a simple selector such as #id, .class, tag, or [data-testid=value].'),
      styleName: z.string().optional().describe('Find nodes that have this computed style name, such as color, display, margin, or padding.'),
      styleValue: z.string().optional().describe('Optional value that the selected style must contain.'),
      styles: z.record(z.string(), z.string()).optional().describe('Find nodes matching all provided computed style values.'),
      id: z.string().optional().describe('Find nodes whose id contains this value.'),
      testId: z.string().optional().describe('Find nodes whose test id contains this value.'),
      text: z.string().optional().describe('Find nodes whose text contains this value.'),
      accessibilityLabel: z.string().optional().describe('Find nodes whose accessibility label contains this value.'),
      className: z.string().optional().describe('Find nodes whose class list contains this value.'),
      role: z.string().optional().describe('Find nodes whose role contains this value.'),
      tag: z.string().optional().describe('Find nodes whose tag contains this value.')
    }

    server.registerTool(
      'list_clients',
      {
        title: 'List UI Check Clients',
        description: 'List clients currently connected through the uicheck WebSocket.',
        inputSchema: {},
        annotations: {
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(this.hub.listClients(), null, 2)
          }
        ]
      })
    )

    server.registerTool(
      'capture_page',
      {
        title: 'Capture Connected Page Screenshot',
        description: 'Ask the connected uicheck client to return a PNG screenshot.',
        inputSchema: {
          ...clientArgs,
          ...captureArgs
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      async (args) => {
        const result = await this.hub.request(
          'capture_page',
          { waitMs: args.waitMs, timeoutMs: args.captureTimeoutMs, forceHtml2Canvas: args.forceHtml2Canvas },
          args.clientId,
          args.timeoutMs
        )
        const screenshot = asScreenshot(result)
        return {
          content: [
            {
              type: 'image',
              mimeType: screenshot.mimeType,
              data: screenshot.base64
            },
            {
              type: 'text',
              text: JSON.stringify({ width: screenshot.width, height: screenshot.height }, null, 2)
            }
          ]
        }
      }
    )

    server.registerTool(
      'capture_element',
      {
        title: 'Capture Connected Element Screenshot',
        description: 'Ask the connected uicheck client to return a PNG screenshot for the first element matching the query.',
        inputSchema: {
          ...clientArgs,
          ...captureArgs,
          ...elementSearchArgs
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      async (args) => {
        const result = await this.hub.request(
          'capture_element',
          {
            waitMs: args.waitMs,
            timeoutMs: args.captureTimeoutMs,
            forceHtml2Canvas: args.forceHtml2Canvas,
            includeHidden: args.includeHidden,
            query: args.query,
            selector: args.selector,
            styleName: args.styleName,
            styleValue: args.styleValue,
            styles: args.styles,
            id: args.id,
            testId: args.testId,
            text: args.text,
            accessibilityLabel: args.accessibilityLabel,
            className: args.className,
            role: args.role,
            tag: args.tag
          },
          args.clientId,
          args.timeoutMs
        )
        const screenshot = asScreenshot(result)
        return {
          content: [
            {
              type: 'image',
              mimeType: screenshot.mimeType,
              data: screenshot.base64
            },
            {
              type: 'text',
              text: JSON.stringify({ width: screenshot.width, height: screenshot.height }, null, 2)
            }
          ]
        }
      }
    )

    server.registerTool(
      'compare_screenshot',
      {
        title: 'Compare Current UI Screenshot',
        description: 'Capture the current page or a matching element, compare it with a provided PNG image, and return mismatch metrics plus a diff image.',
        inputSchema: {
          ...clientArgs,
          ...captureArgs,
          ...elementSearchArgs,
          target: z.enum(['page', 'element']).optional().describe('Compare the full page viewport or a matching element. Defaults to page.'),
          expectedImageBase64: z.string().describe('Expected PNG image as base64 or a data URL.'),
          threshold: z.number().min(0).max(1).optional().describe('Pixelmatch threshold. Defaults to 0.1.')
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      async (args) => {
        const method = args.target === 'element' ? 'capture_element' : 'capture_page'
        const result = await this.hub.request(
          method,
          {
            waitMs: args.waitMs,
            timeoutMs: args.captureTimeoutMs,
            forceHtml2Canvas: args.forceHtml2Canvas,
            includeHidden: args.includeHidden,
            query: args.query,
            selector: args.selector,
            styleName: args.styleName,
            styleValue: args.styleValue,
            styles: args.styles,
            id: args.id,
            testId: args.testId,
            text: args.text,
            accessibilityLabel: args.accessibilityLabel,
            className: args.className,
            role: args.role,
            tag: args.tag
          },
          args.clientId,
          args.timeoutMs
        )
        const screenshot = asScreenshot(result)
        const comparison = comparePngScreenshots(screenshot, args.expectedImageBase64, { threshold: args.threshold })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  width: comparison.width,
                  height: comparison.height,
                  mismatchedPixels: comparison.mismatchedPixels,
                  totalPixels: comparison.totalPixels,
                  mismatchRatio: comparison.mismatchRatio,
                  passed: comparison.passed
                },
                null,
                2
              )
            },
            {
              type: 'image',
              mimeType: 'image/png',
              data: comparison.diffBase64
            }
          ]
        }
      }
    )

    server.registerTool(
      'inspect_elements',
      {
        title: 'Inspect Connected Page Elements',
        description: 'Ask the connected uicheck client to return text, layout boxes, and spacing info.',
        inputSchema: {
          ...clientArgs,
          limit: z.number().int().min(1).max(500).optional().describe('Maximum elements to return. Defaults to 80.'),
          ...elementSearchArgs
        },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      async (args) => {
        const result = await this.hub.request(
          'inspect_elements',
          {
            limit: args.limit,
            includeHidden: args.includeHidden,
            query: args.query,
            selector: args.selector,
            styleName: args.styleName,
            styleValue: args.styleValue,
            styles: args.styles,
            id: args.id,
            testId: args.testId,
            text: args.text,
            accessibilityLabel: args.accessibilityLabel,
            className: args.className,
            role: args.role,
            tag: args.tag
          },
          args.clientId,
          args.timeoutMs
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      }
    )

    return server
  }
}

export function resolveOptions(options: UiCheckMcpServerOptions): ResolvedUiCheckMcpServerOptions {
  return {
    host: options.host ?? '127.0.0.1',
    port: options.port ?? 17322,
    mcpEndpoint: normalizeEndpoint(options.mcpEndpoint ?? '/mcp'),
    socketEndpoint: normalizeEndpoint(options.socketEndpoint ?? '/socket'),
    requestTimeoutMs: options.requestTimeoutMs ?? 30_000
  }
}

function normalizeEndpoint(value: string): string {
  return value.startsWith('/') ? value : `/${value}`
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id')
  response.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
}

function asScreenshot(value: unknown): {
  mimeType: string
  base64: string
  width?: number
  height?: number
} {
  if (!isObject(value) || typeof value.base64 !== 'string') {
    throw new Error('Connected client returned an invalid screenshot payload')
  }

  return {
    mimeType: typeof value.mimeType === 'string' ? value.mimeType : 'image/png',
    base64: value.base64,
    width: typeof value.width === 'number' ? value.width : undefined,
    height: typeof value.height === 'number' ? value.height : undefined
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
