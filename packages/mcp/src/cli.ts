#!/usr/bin/env node
import { UiCheckMcpServer } from './mcp'
import type { UiCheckMcpServerOptions } from './types'

const options = parseArgs(process.argv.slice(2))
const server = new UiCheckMcpServer(options)

await server.listen()
console.log(`uicheck-mcp MCP: ${server.mcpUrl}`)
console.log(`uicheck-mcp socket: ${server.socketUrl}`)

const shutdown = async () => {
  await server.close()
  process.exit(0)
}

process.once('SIGINT', () => {
  void shutdown()
})
process.once('SIGTERM', () => {
  void shutdown()
})

function parseArgs(args: string[]): UiCheckMcpServerOptions {
  const result: UiCheckMcpServerOptions = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]
    if (arg === '--host' && next) {
      result.host = next
      index += 1
    } else if (arg === '--port' && next) {
      result.port = Number(next)
      index += 1
    } else if (arg === '--mcp-endpoint' && next) {
      result.mcpEndpoint = next
      index += 1
    } else if (arg === '--socket-endpoint' && next) {
      result.socketEndpoint = next
      index += 1
    } else if (arg === '--timeout' && next) {
      result.requestTimeoutMs = Number(next)
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }
  return result
}

function printHelp(): void {
  console.log(`Usage: uicheck-mcp [options]

Options:
  --host <host>                  Listen host. Default: 127.0.0.1
  --port <port>                  Listen port. Default: 17322
  --mcp-endpoint <path>          MCP endpoint. Default: /mcp
  --socket-endpoint <path>       uicheck client WebSocket endpoint. Default: /socket
  --timeout <ms>                 Browser client request timeout. Default: 30000
`)
}
