import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, parseUiCheckOptionsFromUrl } from './options'

describe('parseUiCheckOptionsFromUrl', () => {
  it('returns defaults without query params', () => {
    expect(parseUiCheckOptionsFromUrl('http://127.0.0.1:17321/uicheck.js')).toEqual(DEFAULT_OPTIONS)
  })

  it('parses socket options from CDN query params', () => {
    expect(
      parseUiCheckOptionsFromUrl(
        'http://127.0.0.1:17321/uicheck.js?socketUrl=ws://127.0.0.1:17322/socket&clientId=page-a&reconnectMs=2500&socket=false'
      )
    ).toEqual({
      socket: {
        url: 'ws://127.0.0.1:17322/socket',
        clientId: 'page-a',
        reconnectMs: 2500,
        enabled: false
      }
    })
  })

  it('falls back when socket numeric params are invalid', () => {
    const options = parseUiCheckOptionsFromUrl('http://localhost/uicheck.js?socketUrl=ws://localhost/socket&reconnectMs=nope')
    expect(options.socket?.reconnectMs).toBe(1000)
  })
})
