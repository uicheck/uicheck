import { describe, expect, it } from 'vitest'
import {
  createReactNativeUiCheckAdapter,
  installReactNativeUiCheck,
  registerReactNativeUiCheckElement,
  type ReactNativeJsxRuntimeLike,
  type ReactNativeReactLike,
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

  it('can auto-register elements with testID by patching React.createElement', async () => {
    const React = createReact()
    installReactNativeUiCheck(
      {
        ...createReactNative(),
        WebSocket: TestWebSocket
      },
      {
        React,
        autoRegister: true,
        socket: { enabled: false }
      }
    )

    const element = React.createElement('Pressable', {
      testID: 'submit-button',
      children: 'Submit'
    }) as { props: { ref: (value: unknown) => void } }
    element.props.ref({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(8, 16, 140, 48)
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative())
    const result = await adapter.inspectElements({ selector: 'submit-button' })
    element.props.ref(null)

    expect(result).toMatchObject({
      count: 1,
      elements: [
        {
          tag: 'Pressable',
          selector: '[testID="submit-button"]',
          testID: 'submit-button',
          text: 'Submit',
          box: { x: 8, y: 16, width: 140, height: 48 }
        }
      ]
    })
  })

  it('can auto-register elements produced by the JSX runtime', async () => {
    const jsxRuntime = createJsxRuntime()
    installReactNativeUiCheck(
      {
        ...createReactNative(),
        WebSocket: TestWebSocket
      },
      {
        jsxRuntime,
        autoRegister: true,
        socket: { enabled: false }
      }
    )

    const element = jsxRuntime.jsx?.('View', {
      nativeID: 'summary-card',
      accessibilityLabel: 'Summary card',
      children: 'Summary'
    }) as { props: { ref: (value: unknown) => void } }
    element.props.ref({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 20, 200, 80)
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative())
    const result = await adapter.inspectElements({ selector: '#summary-card' })
    element.props.ref(null)

    expect(result).toMatchObject({
      count: 1,
      elements: [
        {
          tag: 'View',
          selector: '#summary-card',
          id: 'summary-card',
          accessibilityLabel: 'Summary card',
          text: 'Summary card',
          box: { x: 12, y: 20, width: 200, height: 80 }
        }
      ]
    })
  })
})

function createReact(): ReactNativeReactLike {
  return {
    createElement: (type, props, ...children) => ({
      type,
      props: {
        ...props,
        children: children.length > 0 ? children : props?.children
      }
    })
  }
}

function createJsxRuntime(): ReactNativeJsxRuntimeLike {
  return {
    jsx: (type, props, key) => ({
      type,
      key,
      props
    }),
    jsxs: (type, props, key) => ({
      type,
      key,
      props
    })
  }
}

class TestWebSocket {
  send(): void {}
  close(): void {}
}
