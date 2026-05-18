import { createReadStream } from 'node:fs'
import { spawn } from 'node:child_process'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import automator from 'miniprogram-automator'
import { WebSocket } from 'ws'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { chromium } from 'playwright'
import { UiCheckMcpServer } from '../packages/mcp/dist/index.js'

const root = process.cwd()
const require = createRequire(import.meta.url)
const MiniProgram = require('miniprogram-automator/out/MiniProgram').default
MiniProgram.prototype.checkVersion = async () => undefined

const cliPath = process.env.WECHAT_DEVTOOLS_CLI ?? '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const projectPath = resolve(root, 'examples/taro-demo/dist')
const output = resolve(root, 'packages/taro/build/uicheck-test-artifacts/taro-weapp-runtime.png')
const rawOutput = resolve(root, 'packages/taro/build/uicheck-test-artifacts/taro-weapp-raw.png')
const clientId = 'taro-evidence'

const staticServer = await createStaticServer(root)
const port = await getFreePort()
const server = new UiCheckMcpServer({ port })
let miniProgram
let mcpClient
let browser
let bridgeSocket
let devtoolsProcess

try {
  await server.listen()
  await enableWeChatDevToolsServicePort()
  await warmUpWeChatDevTools()
  ;({ miniProgram, process: devtoolsProcess } = await launchWeappAutomation())

  const route = '/pages/index/index'
  await miniProgram.reLaunch(route)
  await new Promise((resolveWait) => setTimeout(resolveWait, 5_000))
  bridgeSocket = await connectWeappBridge(server.socketUrl, clientId, miniProgram)
  await waitForMcpClient(server, clientId)

  mcpClient = new Client({ name: 'uicheck-taro-weapp-evidence', version: '0.0.0' })
  await mcpClient.connect(new StreamableHTTPClientTransport(new URL(server.mcpUrl)))

  const inspected = await mcpClient.callTool({
    name: 'inspect_elements',
    arguments: { clientId, limit: 40, timeoutMs: 120_000 }
  }, undefined, { timeout: 120_000 })
  const inspectedPayload = getJsonToolContent(inspected)
  assertInspectedTarget(inspectedPayload)

  const rawCaptured = await mcpClient.callTool({
    name: 'capture_page',
    arguments: { clientId, captureTimeoutMs: 120_000, timeoutMs: 120_000 }
  }, undefined, { timeout: 120_000 })
  const rawImage = getImageToolContent(rawCaptured)
  const rawMetadata = getJsonToolContent(rawCaptured)
  await mkdir(dirname(rawOutput), { recursive: true })
  await writeFile(rawOutput, Buffer.from(rawImage.data, 'base64'))

  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 1 })
  await page.goto(`${staticServer.url}/scripts/evidence-render-host.html`)
  await page.evaluate(
    async ({ screenshot, inspected }) => {
      const mod = await import('/packages/taro/dist/evidence.js')
      mod.renderUiCheckEvidence(document.body, {
        title: 'UICheck Taro WeApp Demo',
        subtitle: 'Real Taro weapp runtime via @uicheck/mcp capture_page + inspect_elements',
        mode: 'phone',
        theme: {
          background: '#f4fee7',
          nav: '#14532d',
          accent: '#0284c7',
          soft: '#dcfce7'
        },
        screenshot,
        elements: inspected.elements.map(normalizeMcpElement).filter(Boolean).slice(0, 18)
      })
      document.documentElement.dataset.uicheckEvidenceReady = 'true'

      function normalizeMcpElement(element, index) {
        if (!element?.box) return null
        const id = String(element.id ?? element.testID ?? element.testId ?? `element-${index + 1}`)
        return {
          id,
          selector: String(element.selector ?? `#${id}`),
          tag: String(element.tag ?? 'node'),
          text: element.text ? String(element.text) : undefined,
          box: {
            x: Number(element.box.x ?? element.box.left ?? 0),
            y: Number(element.box.y ?? element.box.top ?? 0),
            width: Number(element.box.width ?? 0),
            height: Number(element.box.height ?? 0)
          },
          meta: [
            element.testID || element.testId ? `testID: ${element.testID ?? element.testId}` : '',
            Array.isArray(element.classes) && element.classes.length > 0 ? `class: ${element.classes.slice(0, 2).join('.')}` : ''
          ].filter(Boolean),
          selected: id === 'submit' || element.testID === 'submit-button' || element.testId === 'submit-button'
        }
      }
    },
    {
      screenshot: {
        title: rawMetadata.title ?? 'UICheck Taro Demo',
        route: rawMetadata.url ?? 'pages/index/index',
        platform: 'Taro WeApp',
        width: inspectedPayload.viewport?.width ?? rawMetadata.width,
        height: inspectedPayload.viewport?.height ?? rawMetadata.height,
        imageBase64: rawImage.data,
        mimeType: rawImage.mimeType
      },
      inspected: inspectedPayload
    }
  )
  await page.waitForFunction(() => document.documentElement.dataset.uicheckEvidenceReady === 'true')
  await page.locator('.uicheck-evidence-diagram').screenshot({ path: output })
  await page.close()

  console.log(
    JSON.stringify(
      {
        output,
        rawOutput,
        clientId,
        elementCount: inspectedPayload.elements.length,
        screenshot: {
          width: rawMetadata.width,
          height: rawMetadata.height,
          title: rawMetadata.title,
          url: rawMetadata.url
        }
      },
      null,
      2
    )
  )
} finally {
  await browser?.close().catch(() => undefined)
  await mcpClient?.close().catch(() => undefined)
  bridgeSocket?.close()
  await miniProgram?.close().catch(() => undefined)
  devtoolsProcess?.kill()
  await server.close().catch(() => undefined)
  await staticServer.close()
}

function connectWeappBridge(socketUrl, bridgeClientId, miniProgram) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${socketUrl}?clientId=${encodeURIComponent(bridgeClientId)}`)
    const startedAt = Date.now()
    const timeout = setTimeout(() => reject(new Error('Timed out opening Taro weapp MCP bridge socket')), 15_000)

    socket.on('open', async () => {
      clearTimeout(timeout)
      socket.send(JSON.stringify({ type: 'hello', ...(await getWeappClientInfo(miniProgram)) }))
      resolve(socket)
    })
    socket.on('message', (raw) => {
      void handleBridgeMessage(socket, miniProgram, raw.toString())
    })
    socket.on('error', (error) => {
      if (Date.now() - startedAt < 15_000) reject(error)
    })
  })
}

async function handleBridgeMessage(socket, miniProgram, raw) {
  let message
  try {
    message = JSON.parse(raw)
  } catch {
    return
  }
  if (message.type !== 'request' || typeof message.id !== 'string') return

  try {
    const result =
      message.method === 'inspect_elements'
        ? await inspectWeappElements(miniProgram, message.params ?? {})
        : message.method === 'capture_page'
          ? await captureWeappPage(miniProgram)
          : (() => {
              throw new Error(`Unknown uicheck method: ${message.method}`)
            })()
    socket.send(JSON.stringify({ type: 'response', id: message.id, result }))
  } catch (error) {
    socket.send(
      JSON.stringify({
        type: 'response',
        id: message.id,
        error: error instanceof Error ? error.message : String(error)
      })
    )
  }
}

async function getWeappClientInfo(miniProgram) {
  const page = await miniProgram.currentPage()
  const info = await miniProgram.systemInfo().catch(() => ({}))
  return {
    url: page ? `${page.path}${page.query && Object.keys(page.query).length ? `?${new URLSearchParams(page.query).toString()}` : ''}` : 'pages/index/index',
    title: 'UICheck Taro Demo',
    userAgent: 'wechat-devtools-weapp',
    viewport: {
      width: Number(info.windowWidth ?? 390),
      height: Number(info.windowHeight ?? 753),
      devicePixelRatio: Number(info.pixelRatio ?? 2),
      scrollX: 0,
      scrollY: 0
    }
  }
}

async function inspectWeappElements(miniProgram, params) {
  const selector = typeof params.selector === 'string' ? params.selector : '.uicheck-node'
  const limit = typeof params.limit === 'number' ? params.limit : 80
  const page = await withTimeout(miniProgram.currentPage(), 10_000, 'read current Taro weapp page')
  const info = await getWeappClientInfo(miniProgram)
  const nodes = (await withTimeout(page.$$(selector), 10_000, `query Taro weapp elements: ${selector}`)).slice(0, limit)
  const elements = []
  for (const [index, node] of nodes.entries()) {
    const id = await withTimeout(node.attribute('id').catch(() => ''), 3_000, 'read Taro weapp element id')
    const className = await withTimeout(node.attribute('class').catch(() => ''), 3_000, 'read Taro weapp element class')
    const tag = await withTimeout(node.attribute('data-uicheck-tag').catch(() => ''), 3_000, 'read Taro weapp element tag')
    const text = await withTimeout(
      node.attribute('data-text').catch(() => node.text().catch(() => '')),
      3_000,
      'read Taro weapp element text'
    )
    const testId = await withTimeout(node.attribute('data-testid').catch(() => ''), 3_000, 'read Taro weapp element test id')
    const offset = await withTimeout(node.offset().catch(() => ({ left: 0, top: 0 })), 3_000, 'read Taro weapp element offset')
    const size = await withTimeout(node.size().catch(() => ({ width: 0, height: 0 })), 3_000, 'read Taro weapp element size')
    const width = Math.round(Number(size.width ?? 0))
    const height = Math.round(Number(size.height ?? 0))
    const elementId = id || testId || `node-${index + 1}`
    const element = {
      id: elementId,
      selector: id ? `#${id}` : testId ? `[data-testid="${testId}"]` : selector,
      tag: tag || node.tagName || 'node',
      text,
      classes: String(className || '').split(/\s+/).filter(Boolean),
      testId,
      visible: width > 0 && height > 0,
      box: {
        x: Math.round(Number(offset.left ?? 0)),
        y: Math.round(Number(offset.top ?? 0)),
        width,
        height,
        top: Math.round(Number(offset.top ?? 0)),
        left: Math.round(Number(offset.left ?? 0))
      }
    }
    if (params.includeHidden === true || element.visible) elements.push(element)
  }
  return {
    platform: 'taro-weapp',
    url: info.url ?? page?.path,
    title: info.title,
    viewport: info.viewport,
    count: elements.length,
    elements
  }
}

async function captureWeappPage(miniProgram) {
  const tempPath = resolve(root, 'packages/taro/build/uicheck-test-artifacts/taro-weapp-devtools.png')
  await mkdir(dirname(tempPath), { recursive: true })
  await withTimeout(miniProgram.screenshot({ path: tempPath }), 20_000, 'capture Taro weapp screenshot')
  const buffer = await import('node:fs/promises').then((fs) => fs.readFile(tempPath))
  const size = readPngSize(buffer)
  const info = await getWeappClientInfo(miniProgram)
  return {
    url: info.url,
    title: info.title,
    width: size.width,
    height: size.height,
    mimeType: 'image/png',
    base64: buffer.toString('base64')
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeoutMs)
    })
  ]).finally(() => clearTimeout(timer))
}

function readPngSize(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return { width: 0, height: 0 }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  }
}

async function createStaticServer(baseDir) {
  const server = createServer(async (request, response) => {
    const rawPath = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    if (rawPath === '/scripts/evidence-render-host.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <script type="importmap">
    {"imports":{"@uicheck/core/evidence":"/packages/core/dist/evidence.js"}}
  </script>
</head>
<body></body>
</html>`)
      return
    }

    const filePath = resolve(baseDir, `.${decodeURIComponent(rawPath)}`)
    if (!filePath.startsWith(baseDir)) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }

    try {
      const info = await stat(filePath)
      if (!info.isFile()) {
        response.writeHead(404)
        response.end('Not found')
        return
      }
      response.writeHead(200, { 'content-type': filePath.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream' })
      createReadStream(filePath).pipe(response)
    } catch {
      response.writeHead(404)
      response.end('Not found')
    }
  })
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to start evidence server')
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose))
  }
}

async function getFreePort() {
  const server = createNetServer()
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address()
  await new Promise((resolveClose) => server.close(resolveClose))
  if (!address || typeof address === 'string') throw new Error('Unable to allocate port')
  return address.port
}

async function launchWeappAutomation() {
  const autoPort = await getFreePort()
  const args = ['auto']
  if (process.env.CI) args.push('--disable-gpu')
  args.push('--project', projectPath, '--auto-port', String(autoPort), '--trust-project')

  let exitError
  const child = spawn(cliPath, args, { stdio: process.env.CI ? 'inherit' : 'ignore' })
  child.on('error', (error) => {
    exitError = error
  })
  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) exitError = new Error(`WeChat DevTools auto exited with code ${code}`)
    if (signal) exitError = new Error(`WeChat DevTools auto exited with signal ${signal}`)
  })

  const endpoint = `ws://127.0.0.1:${autoPort}`
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (exitError) throw exitError
    try {
      const connected = await automator.connect({ wsEndpoint: endpoint })
      await new Promise((resolveWait) => setTimeout(resolveWait, 5_000))
      return { miniProgram: connected, process: child }
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000))
    }
  }

  child.kill()
  throw new Error(`Timed out connecting to WeChat DevTools automation at ${endpoint}`)
}

async function warmUpWeChatDevTools() {
  if (!process.env.CI || !process.env.WECHAT_DEVTOOLS_HTTP_PORT) return
  const args = ['open', '--project', projectPath, '--port', process.env.WECHAT_DEVTOOLS_HTTP_PORT, '--disable-gpu']
  await runWeChatDevToolsCommand(args, 60_000, false)
  await waitForWeChatIdePortFile(60_000).catch(() => undefined)
}

function runWeChatDevToolsCommand(args, timeoutMs, rejectOnFailure = true) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(cliPath, args, { stdio: process.env.CI ? 'inherit' : 'ignore' })
    const timer = setTimeout(() => {
      child.kill()
      if (rejectOnFailure) rejectCommand(new Error(`Timed out running WeChat DevTools CLI: ${args.join(' ')}`))
      else resolveCommand()
    }, timeoutMs)
    child.on('error', (error) => {
      clearTimeout(timer)
      if (rejectOnFailure) rejectCommand(error)
      else resolveCommand()
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      if (rejectOnFailure && code !== 0) rejectCommand(new Error(`WeChat DevTools CLI exited with code ${code}: ${args.join(' ')}`))
      else resolveCommand()
    })
  })
}

async function waitForWeChatIdePortFile(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const files = await findWeChatProfileFiles('.ide')
    if (files.length > 0) return files
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000))
  }
  throw new Error('Timed out waiting for WeChat DevTools .ide port file')
}

async function enableWeChatDevToolsServicePort() {
  const supportDir =
    process.env.WECHAT_DEVTOOLS_SUPPORT_DIR ?? resolve(homedir(), 'Library/Application Support/微信开发者工具')
  let entries = []
  try {
    entries = await readdir(supportDir, { withFileTypes: true })
  } catch {
    return
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const profileDir = resolve(supportDir, entry.name, 'Default')
        try {
          await mkdir(profileDir, { recursive: true })
          await writeFile(resolve(profileDir, '.ide-status'), 'On')
        } catch {
          // Best effort: newer DevTools can also be started with --port.
        }
      })
  )
}

async function findWeChatProfileFiles(fileName) {
  const supportDir =
    process.env.WECHAT_DEVTOOLS_SUPPORT_DIR ?? resolve(homedir(), 'Library/Application Support/微信开发者工具')
  let entries = []
  try {
    entries = await readdir(supportDir, { withFileTypes: true })
  } catch {
    return []
  }

  const files = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const filePath = resolve(supportDir, entry.name, 'Default', fileName)
    try {
      const info = await stat(filePath)
      if (info.isFile()) files.push(filePath)
    } catch {
      // Ignore profiles that have not created this file yet.
    }
  }
  return files
}

async function waitForMcpClient(server, expectedClientId) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const response = await fetch(new URL('/health', server.mcpUrl))
    const health = await response.json()
    if (Array.isArray(health.clients) && health.clients.some((client) => client.id === expectedClientId)) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }
  throw new Error(`Timed out waiting for @uicheck/mcp client ${expectedClientId}`)
}

function getImageToolContent(result) {
  const content = Array.isArray(result.content) ? result.content : []
  const image = content.find((item) => item?.type === 'image')
  if (!image || typeof image.data !== 'string') throw new Error(`Missing image content: ${JSON.stringify(result)}`)
  if (image.mimeType !== 'image/png') throw new Error(`Expected image/png, got ${image.mimeType}`)
  return image
}

function getJsonToolContent(result) {
  const content = Array.isArray(result.content) ? result.content : []
  const text = content.find((item) => item?.type === 'text' && typeof item.text === 'string')
  if (!text) throw new Error(`Missing JSON text content: ${JSON.stringify(result)}`)
  return JSON.parse(text.text)
}

function assertInspectedTarget(payload) {
  if (!Array.isArray(payload.elements) || payload.elements.length === 0) {
    throw new Error('@uicheck/mcp inspect_elements returned no Taro weapp elements')
  }
  const hasSubmit = payload.elements.some((element) => element?.id === 'submit' || element?.testId === 'submit-button')
  if (!hasSubmit) throw new Error('@uicheck/mcp inspect_elements did not see #submit in Taro weapp')
}
