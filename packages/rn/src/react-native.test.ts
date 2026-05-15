import { describe, expect, it } from 'vitest'
import {
  createReactNativeUiCheckAdapter,
  registerReactNativeUiCheckElement,
  type ReactNativeLike
} from './react-native'

function createReactNative(): ReactNativeLike {
  return {
    Dimensions: {
      get: () => ({ width: 390, height: 844, scale: 3 })
    },
    Platform: {
      OS: 'ios'
    }
  }
}

describe('createReactNativeUiCheckAdapter', () => {
  it('inspects registered native elements', async () => {
    const unregister = registerReactNativeUiCheckElement({
      ref: {
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 24, 120, 44)
      },
      tag: 'Pressable',
      testID: 'submit',
      text: '提交'
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative(), {
      route: 'Home',
      title: 'Demo'
    })
    const result = await adapter.inspectElements({ selector: 'submit' })
    unregister()

    expect(result).toMatchObject({
      platform: 'react-native',
      os: 'ios',
      url: 'Home',
      title: 'Demo',
      viewport: { width: 390, height: 844, devicePixelRatio: 3 },
      count: 1,
      elements: [
        {
          tag: 'Pressable',
          selector: '[testID="submit"]',
          testID: 'submit',
          text: '提交',
          visible: true,
          box: { x: 12, y: 24, width: 120, height: 44 }
        }
      ]
    })
  })

  it('finds the smallest registered element at a point', async () => {
    const unregisterOuter = registerReactNativeUiCheckElement({
      ref: {
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(0, 0, 200, 200)
      },
      id: 'outer'
    })
    const unregisterInner = registerReactNativeUiCheckElement({
      ref: {
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(20, 20, 40, 40)
      },
      id: 'inner'
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative())
    const result = await adapter.getElementAtPoint({ x: 25, y: 25 })
    unregisterOuter()
    unregisterInner()

    expect(result.element).toMatchObject({ id: 'inner', selector: '#inner' })
    expect(result.ancestors).toEqual([])
  })
})
