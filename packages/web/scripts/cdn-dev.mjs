import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import * as esbuild from 'esbuild'

const port = Number(process.env.UICHECK_CDN_PORT ?? 17321)
const once = process.argv.includes('--once')
const root = new URL('..', import.meta.url)
const outfile = new URL('dist/uicheck.js', root)

const buildOptions = {
  entryPoints: [new URL('src/cdn.ts', root).pathname],
  outfile: outfile.pathname,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  logLevel: 'info'
}

if (once) {
  await esbuild.build(buildOptions)
} else {
  const context = await esbuild.context(buildOptions)
  await context.watch()

  createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `localhost:${port}`}`)
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache'
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, headers)
      response.end()
      return
    }

    if (url.pathname === '/health') {
      response.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ ok: true }))
      return
    }

    const file =
      url.pathname === '/uicheck.js'
        ? outfile
        : url.pathname === '/uicheck.js.map'
          ? new URL('dist/uicheck.js.map', root)
          : null

    if (!file) {
      response.writeHead(404, headers)
      response.end('Not found')
      return
    }

    try {
      const content = await readFile(file)
      response.writeHead(200, {
        ...headers,
        'Content-Type': url.pathname.endsWith('.map')
          ? 'application/json; charset=utf-8'
          : 'application/javascript; charset=utf-8'
      })
      response.end(content)
    } catch {
      response.writeHead(503, headers)
      response.end('uicheck bundle is not ready yet')
    }
  }).listen(port, () => {
    console.log(`uicheck local CDN: http://localhost:${port}/uicheck.js`)
  })
}
