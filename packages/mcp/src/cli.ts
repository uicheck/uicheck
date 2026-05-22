#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { UiCheckMcpServer } from './mcp'
import { checkForMcpUpdate } from './update-check'
import type { UiCheckMcpServerOptions } from './types'

const options = parseArgs(process.argv.slice(2))
const server = new UiCheckMcpServer(options.server)

await server.listen()
console.log(`uicheck-mcp MCP: ${server.mcpUrl}`)
console.log(`uicheck-mcp socket: ${server.socketUrl}`)
if (options.updateCheck) {
  void getPackageVersion().then((currentVersion) =>
    checkForMcpUpdate({
      currentVersion,
      log: (message) => console.log(message)
    })
  )
}

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

interface CliOptions {
  server: UiCheckMcpServerOptions
  updateCheck: boolean
}

function parseArgs(args: string[]): CliOptions {
  const serverOptions: UiCheckMcpServerOptions = {}
  let updateCheck = !isUpdateCheckDisabled()
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]
    if (arg === '--host' && next) {
      serverOptions.host = next
      index += 1
    } else if (arg === '--port' && next) {
      serverOptions.port = Number(next)
      index += 1
    } else if (arg === '--mcp-endpoint' && next) {
      serverOptions.mcpEndpoint = next
      index += 1
    } else if (arg === '--socket-endpoint' && next) {
      serverOptions.socketEndpoint = next
      index += 1
    } else if (arg === '--timeout' && next) {
      serverOptions.requestTimeoutMs = Number(next)
      index += 1
    } else if (arg === '--no-update-check') {
      updateCheck = false
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }
  return { server: serverOptions, updateCheck }
}

function isUpdateCheckDisabled(): boolean {
  return ['UICHECK_NO_UPDATE_CHECK', 'NO_UPDATE_CHECK'].some((name) => {
    const value = process.env[name]
    return value === '1' || value === 'true'
  })
}

async function getPackageVersion(): Promise<string> {
  try {
    const packageJsonUrl = new URL('../package.json', import.meta.url)
    const packageJson = JSON.parse(await readFile(packageJsonUrl, 'utf8')) as { version?: unknown }
    return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function printHelp(): void {
  console.log(`Usage: uicheck-mcp [options]

Options:
  --host <host>                  Listen host. Default: 127.0.0.1
  --port <port>                  Listen port. Default: 17322
  --mcp-endpoint <path>          MCP endpoint. Default: /mcp
  --socket-endpoint <path>       uicheck client WebSocket endpoint. Default: /socket
  --timeout <ms>                 Browser client request timeout. Default: 30000
  --no-update-check              Disable npm update check on startup
`)
}
