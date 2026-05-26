import { describe, expect, it, vi } from 'vitest'
import { createTaroUiCheckAdapter, type TaroLike, type TaroSelectorQueryNode } from './taro'

function createTaro(nodes: TaroSelectorQueryNode[]): TaroLike {
  return {
    connectSocket: vi.fn(() => ({
      send: vi.fn(),
      close: vi.fn(),
      onOpen: vi.fn(),
      onMessage: vi.fn(),
      onClose: vi.fn()
    })),
    createSelectorQuery: () => {
      const query = {
        selectAll: vi.fn(() => ({
          fields: vi.fn((_fields, callback) => {
            callback(nodes)
            return query
          }),
          boundingClientRect: vi.fn((callback) => {
            callback(nodes)
            return query
          })
        })),
        selectViewport: vi.fn(() => ({
          scrollOffset: vi.fn((callback) => {
            callback({ scrollLeft: 3, scrollTop: 5 })
            return query
          })
        })),
        exec: vi.fn((callback?: () => void) => callback?.())
      }
      return query
    },
    getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3 })
  }
}

describe('createTaroUiCheckAdapter', () => {
  it('inspects mini program elements from selector query nodes', async () => {
    const adapter = createTaroUiCheckAdapter({ taro: createTaro([
      {
        id: 'submit',
        className: 'primary button',
        dataset: { uicheckTag: 'button', text: '提交' },
        left: 10,
        top: 20,
        width: 88,
        height: 32
      }
    ]) })

    const result = await adapter.inspectElements({ limit: 10 })

    expect(result).toMatchObject({
      platform: 'taro',
      viewport: { width: 390, height: 844, devicePixelRatio: 3, scrollX: 3, scrollY: 5 },
      count: 1,
      tree: [
        {
          tag: 'button',
          text: '提交',
          visible: true,
          box: { x: 10, y: 20, width: 88, height: 32 }
        }
      ]
    })
  })

  it('uses the global Taro runtime when options omit taro', async () => {
    const taro = createTaro([
      {
        id: 'global-submit',
        dataset: { uicheckTag: 'button', text: 'Global submit' },
        left: 1,
        top: 2,
        width: 30,
        height: 16
      }
    ])
    const previousTaro = (globalThis as { Taro?: TaroLike }).Taro
    ;(globalThis as { Taro?: TaroLike }).Taro = taro

    try {
      const adapter = createTaroUiCheckAdapter({})
      const result = await adapter.inspectElements({ limit: 10 })

      expect(result).toMatchObject({
        platform: 'taro',
        count: 1,
        tree: [
          {
            tag: 'button',
            text: 'Global submit'
          }
        ]
      })
    } finally {
      if (previousTaro) (globalThis as { Taro?: TaroLike }).Taro = previousTaro
      else delete (globalThis as { Taro?: TaroLike }).Taro
    }
  })

  it('filters inspect results to the matching node parent tree', async () => {
    const adapter = createTaroUiCheckAdapter({ taro: createTaro([
      {
        id: 'page',
        dataset: { uicheckTag: 'view' },
        left: 0,
        top: 0,
        width: 300,
        height: 300
      },
      {
        id: 'submit',
        dataset: { uicheckTag: 'button', text: 'Submit order' },
        left: 20,
        top: 20,
        width: 120,
        height: 40
      },
      {
        id: 'ignored',
        dataset: { uicheckTag: 'text', text: 'Ignored' },
        left: 20,
        top: 80,
        width: 120,
        height: 20
      }
    ]) })

    const result = await adapter.inspectElements({ text: 'Submit' })

    expect(result).toMatchObject({
      count: 2,
      tree: [
        {
          id: 'page',
          children: [
            {
              id: 'submit',
              text: 'Submit order',
              children: []
            }
          ]
        }
      ]
    })
  })

  it('uses the screenshot provider for element captures with search params', async () => {
    const screenshot = vi.fn(() => ({
      mimeType: 'image/png',
      base64: 'dGFyby1lbGVtZW50'
    }))
    const adapter = createTaroUiCheckAdapter({ taro: createTaro([]), screenshot })

    await expect(adapter.captureElement({ text: 'Submit order' })).resolves.toMatchObject({
      mimeType: 'image/png',
      base64: 'dGFyby1lbGVtZW50'
    })
    expect(screenshot).toHaveBeenCalledWith({ text: 'Submit order' })
  })

})
