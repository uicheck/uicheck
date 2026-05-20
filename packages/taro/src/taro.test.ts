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

})
