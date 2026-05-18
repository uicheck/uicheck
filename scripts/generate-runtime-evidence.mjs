import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { chromium } from 'playwright'
import { UiCheckMcpServer } from '../packages/mcp/dist/index.js'

const root = process.cwd()
const require = createRequire(import.meta.url)
const html2canvasPath = require.resolve('html2canvas/dist/html2canvas.esm.js', {
  paths: [resolve(root, 'packages/web')]
})

const targets = [
  {
    name: 'web',
    app: 'examples/web-demo/index.html',
    output: 'packages/web/build/uicheck-test-artifacts/web-runtime.png',
    rawViewport: { width: 560, height: 360 },
    evidenceViewport: { width: 1440, height: 900 }
  }
]

await Promise.all(targets.map((target) => rm(resolve(root, dirname(target.output)), { recursive: true, force: true })))

const staticServer = await createStaticServer(root)
const browser = await chromium.launch()
try {
  for (const target of targets) {
    const port = await getFreePort()
    const server = new UiCheckMcpServer({ port })
    const clientId = `${target.name}-evidence`
    let client
    await server.listen()
    const page = await browser.newPage({ viewport: target.rawViewport, deviceScaleFactor: 1 })
    try {
      const pageUrl = new URL(`${staticServer.url}/${target.app}`)
      pageUrl.searchParams.set('socketUrl', server.socketUrl)
      pageUrl.searchParams.set('clientId', clientId)

      await page.goto(pageUrl.href, { waitUntil: 'load' })
      await page.addStyleTag({
        content: `
          .uicheck-demo-app{padding:0!important;background:#fff!important}
          .uicheck-demo-screen{border:0!important;border-radius:0!important;box-shadow:none!important}
        `
      })
      await page.waitForFunction(() => document.documentElement.dataset.uicheckReady === 'true')
      await page.locator('[data-uicheck-target]').waitFor()
      await waitForMcpClient(server, clientId)

      client = new Client({ name: 'uicheck-evidence', version: '0.0.0' })
      await client.connect(new StreamableHTTPClientTransport(new URL(server.mcpUrl)))
      const inspected = await client.callTool({
        name: 'inspect_elements',
        arguments: {
          clientId,
          limit: 40,
          timeoutMs: 120_000
        }
      })
      assertInspectedTarget(target, inspected)

      const rawCaptured = await client.callTool({
        name: 'capture_page',
        arguments: {
          clientId,
          forceHtml2Canvas: true,
          captureTimeoutMs: 60_000,
          timeoutMs: 120_000
        }
      })
      const rawImage = getImageToolContent(rawCaptured)
      const rawMetadata = getJsonToolContent(rawCaptured)
      assertCapturedImage(target.name, target.rawViewport, rawCaptured)

      await page.setViewportSize(target.evidenceViewport)
      await page.evaluate(
        ({ screenshot, inspectedPayload }) => {
          if (typeof globalThis.uicheckRenderEvidenceFromMcp !== 'function') {
            throw new Error('Demo page did not expose uicheckRenderEvidenceFromMcp')
          }
          globalThis.uicheckRenderEvidenceFromMcp({ screenshot, inspected: inspectedPayload })
        },
        {
          screenshot: {
            ...rawMetadata,
            mimeType: rawImage.mimeType,
            base64: rawImage.data
          },
          inspectedPayload: getJsonToolContent(inspected)
        }
      )
      await page.waitForFunction(() => document.documentElement.dataset.uicheckEvidenceReady === 'true')

      const captured = await client.callTool({
        name: 'capture_page',
        arguments: {
          clientId,
          forceHtml2Canvas: true,
          captureTimeoutMs: 60_000,
          timeoutMs: 120_000
        }
      })

      const image = getImageToolContent(captured)
      await mkdir(resolve(root, dirname(target.output)), { recursive: true })
      await writeFile(resolve(root, target.output), Buffer.from(image.data, 'base64'))
      assertCapturedImage(target.name, target.evidenceViewport, captured)
      console.log(`captured ${target.name} evidence via @uicheck/mcp capture_page -> ${target.output}`)
    } finally {
      await client?.close().catch(() => undefined)
      await page.close().catch(() => undefined)
      await server.close().catch(() => undefined)
    }
  }
} finally {
  await browser.close()
  await staticServer.close()
}

async function createStaticServer(baseDir) {
  const server = createServer(async (request, response) => {
    const rawPath = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    if (rawPath === '/vendor/html2canvas.esm.js') {
      response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      createReadStream(html2canvasPath).pipe(response)
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
      response.writeHead(200, { 'content-type': getContentType(filePath) })
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
  if (!address || typeof address === 'string') throw new Error('Unable to allocate MCP port')
  return address.port
}

async function waitForMcpClient(server, clientId) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const response = await fetch(new URL('/health', server.mcpUrl))
    const health = await response.json()
    if (Array.isArray(health.clients) && health.clients.some((client) => client.id === clientId)) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error(`Timed out waiting for @uicheck/mcp client ${clientId}`)
}

function getImageToolContent(result) {
  const content = Array.isArray(result.content) ? result.content : []
  const image = content.find((item) => item?.type === 'image')
  if (!image || typeof image.data !== 'string') {
    throw new Error(`@uicheck/mcp capture_page did not return image content: ${JSON.stringify(result)}`)
  }
  if (image.mimeType !== 'image/png') {
    throw new Error(`@uicheck/mcp capture_page returned ${image.mimeType ?? 'unknown'} instead of image/png`)
  }
  return image
}

function assertCapturedImage(name, viewport, result) {
  const metadata = getJsonToolContent(result)
  if (metadata.width !== viewport.width || metadata.height !== viewport.height) {
    throw new Error(
      `@uicheck/mcp capture_page returned ${metadata.width}x${metadata.height} for ${name}; expected ${viewport.width}x${viewport.height}`
    )
  }
}

function assertInspectedTarget(target, result) {
  const payload = getJsonToolContent(result)
  if (!Array.isArray(payload.elements) || payload.elements.length === 0) {
    throw new Error(`@uicheck/mcp inspect_elements returned no elements for ${target.name}`)
  }
  const hasTarget = payload.elements.some((element) => element?.testId === 'submit-button' || element?.id === 'submit' || element?.selector === '#submit')
  if (!hasTarget) {
    throw new Error(`@uicheck/mcp inspect_elements did not see the submit target for ${target.name}`)
  }
}

function getJsonToolContent(result) {
  const content = Array.isArray(result.content) ? result.content : []
  const text = content.find((item) => item?.type === 'text' && typeof item.text === 'string')
  if (!text) throw new Error('@uicheck/mcp capture_page did not return metadata text')
  return JSON.parse(text.text)
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  return 'application/octet-stream'
}
