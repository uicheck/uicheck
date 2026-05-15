import { describe, expect, it, vi } from 'vitest'
import { handleRuntimeMessage } from './protocol'
import type { UiCheckToolAdapter } from './types'

function createAdapter(): UiCheckToolAdapter {
  return {
    getClientInfo: () => ({
      viewport: {
        width: 1,
        height: 1,
        devicePixelRatio: 1,
        scrollX: 0,
        scrollY: 0
      }
    }),
    capturePage: vi.fn(() => ({ mimeType: 'image/png', base64: 'a' })),
    inspectElements: vi.fn(() => ({ elements: [] })),
    getElementAtPoint: vi.fn(() => ({ element: null }))
  }
}

describe('handleRuntimeMessage', () => {
  it('dispatches inspect_elements requests to the adapter', async () => {
    const adapter = createAdapter()
    const send = vi.fn()

    await handleRuntimeMessage(adapter, JSON.stringify({ type: 'request', id: '1', method: 'inspect_elements', params: { limit: 2 } }), send)

    expect(adapter.inspectElements).toHaveBeenCalledWith({ limit: 2 })
    expect(send).toHaveBeenCalledWith({ type: 'response', id: '1', result: { elements: [] } })
  })

  it('returns an error response for unknown methods', async () => {
    const send = vi.fn()

    await handleRuntimeMessage(createAdapter(), JSON.stringify({ type: 'request', id: '2', method: 'missing' }), send)

    expect(send).toHaveBeenCalledWith({ type: 'response', id: '2', error: 'Unknown uicheck method: missing' })
  })
})
