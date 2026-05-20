import { describe, expect, it } from 'vitest'
import {
  createReactNativeUiCheckAdapter,
  initUiCheck,
  type ReactNativeJsxRuntimeLike,
  type ReactNativeReactLike,
  type ReactNativeUiCheckOptions,
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
  it('inspects auto-registered native elements', async () => {
    const React = createReact()
    initUiCheck({
      ...createReactNative(),
      WebSocket: TestWebSocket,
      React,
      socket: { enabled: false }
    } as ReactNativeUiCheckOptions)
    const element = React.createElement('Pressable', {
      testID: 'submit',
      children: '提交'
    }) as { props: { ref: (value: unknown) => void } }
    element.props.ref({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 24, 120, 44)
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative())
    const result = await adapter.inspectElements()
    element.props.ref(null)

    expect(result).toMatchObject({
      platform: 'react-native',
      os: 'ios',
      viewport: { width: 390, height: 844, devicePixelRatio: 3 },
      count: 1,
      tree: [
        {
          tag: 'Pressable',
          testID: 'submit',
          text: '提交',
          visible: true,
          box: { x: 12, y: 24, width: 120, height: 44 }
        }
      ]
    })
  })

  it('can auto-register elements with testID by patching React.createElement', async () => {
    const React = createReact()
    initUiCheck({
      ...createReactNative(),
      WebSocket: TestWebSocket,
      React,
      socket: { enabled: false }
    } as ReactNativeUiCheckOptions)

    const element = React.createElement('Pressable', {
      testID: 'submit-button',
      children: 'Submit'
    }) as { props: { ref: (value: unknown) => void } }
    element.props.ref({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(8, 16, 140, 48)
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative())
    const result = await adapter.inspectElements()
    element.props.ref(null)

    expect(result).toMatchObject({
      count: 1,
      tree: [
        {
          tag: 'Pressable',
          testID: 'submit-button',
          text: 'Submit',
          box: { x: 8, y: 16, width: 140, height: 48 }
        }
      ]
    })
  })

  it('can auto-register elements produced by the JSX runtime', async () => {
    const jsxRuntime = createJsxRuntime()
    initUiCheck({
      ...createReactNative(),
      WebSocket: TestWebSocket,
      jsxRuntime,
      socket: { enabled: false }
    } as ReactNativeUiCheckOptions)

    const element = jsxRuntime.jsx?.('View', {
      nativeID: 'summary-card',
      accessibilityLabel: 'Summary card',
      children: 'Summary'
    }) as { props: { ref: (value: unknown) => void } }
    element.props.ref({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(12, 20, 200, 80)
    })

    const adapter = createReactNativeUiCheckAdapter(createReactNative())
    const result = await adapter.inspectElements()
    element.props.ref(null)

    expect(result).toMatchObject({
      count: 1,
      tree: [
        {
          tag: 'View',
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
