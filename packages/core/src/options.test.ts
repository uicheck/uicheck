import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, parseUiCheckOptionsFromUrl } from './options'

describe('parseUiCheckOptionsFromUrl', () => {
  it('returns defaults without query params', () => {
    expect(parseUiCheckOptionsFromUrl('http://127.0.0.1:17321/uicheck.js')).toEqual(DEFAULT_OPTIONS)
  })

  it('parses visual and socket options from CDN query params', () => {
    expect(
      parseUiCheckOptionsFromUrl(
        'http://127.0.0.1:17321/uicheck.js?position=top-right&offset=8,12&size=44&color=%230ea5e9&draggable=false&socketUrl=ws://127.0.0.1:17322/socket&clientId=page-a&reconnectMs=2500&socket=false'
      )
    ).toEqual({
      position: 'top-right',
      offset: [8, 12],
      size: 44,
      color: '#0ea5e9',
      draggable: false,
      socket: {
        url: 'ws://127.0.0.1:17322/socket',
        clientId: 'page-a',
        reconnectMs: 2500,
        enabled: false
      }
    })
  })

  it('falls back when numeric params are invalid', () => {
    const options = parseUiCheckOptionsFromUrl('http://localhost/uicheck.js?offset=bad,12&size=NaN&socketUrl=ws://localhost/socket&reconnectMs=nope')
    expect(options.offset).toEqual(DEFAULT_OPTIONS.offset)
    expect(options.size).toBe(DEFAULT_OPTIONS.size)
    expect(options.socket?.reconnectMs).toBe(1000)
  })
})
