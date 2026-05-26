import { connectUiCheckRuntime, countElementTree, createFilteredElementTree, normalizeElementSearch } from '@uicheck/core'
import type { UiCheckSocketTransport } from '@uicheck/core/protocol'
import type { UiCheckClientSnapshot, UiCheckScreenshotResult, UiCheckSocketOptions, UiCheckToolAdapter } from '@uicheck/core'

type ReactNativeUiCheckToolAdapter = UiCheckToolAdapter & {
  captureElement(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
}

export interface ReactNativeWebSocketLike {
  readyState?: number
  send(message: string): void
  close(): void
  addEventListener?(event: 'open' | 'message' | 'close' | 'error', listener: (event?: unknown) => void): void
  removeEventListener?(event: 'open' | 'message' | 'close' | 'error', listener: (event?: unknown) => void): void
  onopen?: () => void
  onmessage?: (event: { data?: unknown } | unknown) => void
  onclose?: () => void
  onerror?: (error?: unknown) => void
}

export interface ReactNativeWebSocketConstructor {
  new (url: string): ReactNativeWebSocketLike
}

export interface ReactNativeDimensionsLike {
  get(name: 'window' | 'screen'): {
    width?: number
    height?: number
    scale?: number
    fontScale?: number
  }
  addEventListener?(
    event: 'change',
    listener: () => void
  ): { remove?: () => void } | (() => void) | void
}

export interface ReactNativePlatformLike {
  OS?: string
}

export interface ReactNativeUIManagerLike {
  measure?(handle: number, callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void): void
  measureInWindow?(handle: number, callback: (x: number, y: number, width: number, height: number) => void): void
}

export interface ReactNativeLike {
  Dimensions?: ReactNativeDimensionsLike
  Platform?: ReactNativePlatformLike
  UIManager?: ReactNativeUIManagerLike
  AppState?: {
    addEventListener?(event: 'change', listener: () => void): { remove?: () => void } | (() => void) | void
  }
  findNodeHandle?(ref: unknown): number | null
  WebSocket?: ReactNativeWebSocketConstructor
  React?: ReactNativeReactLike
  jsxRuntime?: ReactNativeJsxRuntimeLike
}

export interface ReactNativeReactLike {
  createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown
}

export interface ReactNativeJsxRuntimeLike {
  jsx?(type: unknown, props?: Record<string, unknown> | null, key?: unknown): unknown
  jsxs?(type: unknown, props?: Record<string, unknown> | null, key?: unknown): unknown
  jsxDEV?(type: unknown, props?: Record<string, unknown> | null, key?: unknown, ...rest: unknown[]): unknown
}

export type ReactNativeRef =
  | {
      current?: unknown
    }
  | unknown

interface ReactNativeMeasuredElement {
  ref: ReactNativeRef
  id?: string
  tag?: string
  testID?: string
  text?: string
  accessibilityLabel?: string
  className?: string
  visible?: boolean
  dataset?: Record<string, unknown>
}

export interface ReactNativeUiCheckOptions {
  socket?: UiCheckSocketOptions
  screenshot?(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
}

export type UiCheckOptions = ReactNativeUiCheckOptions
type ReactNativeRuntimeOptions = ReactNativeUiCheckOptions & ReactNativeLike
type OptionalRequire = (id: string) => unknown

interface RegisteredElement extends ReactNativeMeasuredElement {
  uid: number
}

interface ReactNativeElementInfo {
  tag: string
  id?: string
  testID?: string
  accessibilityLabel?: string
  classes: string[]
  text?: string
  visible: boolean
  box: {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
  }
  dataset?: Record<string, unknown>
}

let nextUid = 1
const registry = new Set<RegisteredElement>()
const autoRegisteredReact = new WeakSet<ReactNativeReactLike>()
const autoRegisteredJsxRuntime = new WeakSet<ReactNativeJsxRuntimeLike>()

function getOptionalRequire(): OptionalRequire | undefined {
  const globalRequire = (globalThis as { require?: OptionalRequire }).require
  if (typeof globalRequire === 'function') return globalRequire
  try {
    return new Function('id', 'return require(id)') as OptionalRequire
  } catch {
    return undefined
  }
}

function loadModule<T>(id: string): T | undefined {
  const optionalRequire = getOptionalRequire()
  if (!optionalRequire) return undefined
  try {
    return optionalRequire(id) as T
  } catch {
    return undefined
  }
}

function resolveReactNativeRuntime(options: ReactNativeRuntimeOptions): ReactNativeRuntimeOptions {
  const reactNative = loadModule<ReactNativeLike>('react-native') ?? {}
  return {
    ...reactNative,
    React: loadModule<ReactNativeReactLike>('react'),
    jsxRuntime: loadModule<ReactNativeJsxRuntimeLike>('react/jsx-runtime'),
    WebSocket: globalThis.WebSocket as unknown as ReactNativeWebSocketConstructor | undefined,
    ...options
  }
}

function registerMeasuredElement(registration: ReactNativeMeasuredElement): () => void {
  const item: RegisteredElement = {
    ...registration,
    uid: nextUid++
  }
  registry.add(item)
  return () => {
    registry.delete(item)
  }
}

function clampLimit(value: unknown): number {
  return typeof value === 'number' ? Math.min(Math.max(Math.floor(value), 1), 500) : 80
}

function compactText(value: string | undefined): string | undefined {
  if (!value) return undefined
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 160 ? `${text.slice(0, 157)}...` : text || undefined
}

function getRefValue(ref: ReactNativeRef): unknown {
  if (ref && typeof ref === 'object' && 'current' in ref) return (ref as { current?: unknown }).current
  return ref
}

function getViewportInfo(reactNative: ReactNativeLike): UiCheckClientSnapshot['viewport'] {
  const window = reactNative.Dimensions?.get('window') ?? {}
  return {
    width: Math.round(window.width ?? 0),
    height: Math.round(window.height ?? 0),
    devicePixelRatio: window.scale ?? 1,
    scrollX: 0,
    scrollY: 0
  }
}

function toClasses(className: string | undefined): string[] {
  return className?.split(/\s+/).filter(Boolean) ?? []
}

interface ReactNativeUiCheckAutoRegisterOptions {
  enabled: boolean
}

function getAutoRegisterOptions(hasRuntime: boolean): ReactNativeUiCheckAutoRegisterOptions | undefined {
  return hasRuntime ? { enabled: true } : undefined
}

function installAutoRegister(React: ReactNativeReactLike | undefined, options: ReactNativeUiCheckAutoRegisterOptions | undefined): void {
  if (!React || !options?.enabled || autoRegisteredReact.has(React)) return

  const originalCreateElement = React.createElement.bind(React)
  React.createElement = (type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]) => {
    const registration = getAutoRegistration(type, props, options)
    if (!registration) return originalCreateElement(type, props, ...children)

    return originalCreateElement(type, createAutoRegisteredProps(props, registration), ...children)
  }
  autoRegisteredReact.add(React)
}

function installJsxRuntimeAutoRegister(
  jsxRuntime: ReactNativeJsxRuntimeLike | undefined,
  options: ReactNativeUiCheckAutoRegisterOptions | undefined
): void {
  if (!jsxRuntime || !options?.enabled || autoRegisteredJsxRuntime.has(jsxRuntime)) return

  const originalJsx = jsxRuntime.jsx?.bind(jsxRuntime)
  const originalJsxs = jsxRuntime.jsxs?.bind(jsxRuntime)
  const originalJsxDEV = jsxRuntime.jsxDEV?.bind(jsxRuntime)

  if (originalJsx) {
    jsxRuntime.jsx = (type: unknown, props?: Record<string, unknown> | null, key?: unknown) =>
      originalJsx(type, createMaybeAutoRegisteredProps(type, props, options), key)
  }
  if (originalJsxs) {
    jsxRuntime.jsxs = (type: unknown, props?: Record<string, unknown> | null, key?: unknown) =>
      originalJsxs(type, createMaybeAutoRegisteredProps(type, props, options), key)
  }
  if (originalJsxDEV) {
    jsxRuntime.jsxDEV = (type: unknown, props?: Record<string, unknown> | null, key?: unknown, ...rest: unknown[]) =>
      originalJsxDEV(type, createMaybeAutoRegisteredProps(type, props, options), key, ...rest)
  }

  autoRegisteredJsxRuntime.add(jsxRuntime)
}

function createMaybeAutoRegisteredProps(
  type: unknown,
  props: Record<string, unknown> | null | undefined,
  options: ReactNativeUiCheckAutoRegisterOptions
): Record<string, unknown> | null | undefined {
  const registration = getAutoRegistration(type, props, options)
  return registration ? createAutoRegisteredProps(props, registration) : props
}

function getAutoRegistration(
  type: unknown,
  props: Record<string, unknown> | null | undefined,
  options: ReactNativeUiCheckAutoRegisterOptions
): Omit<ReactNativeMeasuredElement, 'ref'> | undefined {
  if (!props) return undefined
  const testID = typeof props.testID === 'string' ? props.testID : undefined
  const accessibilityLabel =
    typeof props.accessibilityLabel === 'string' ? props.accessibilityLabel : undefined
  const nativeID = typeof props.nativeID === 'string' ? props.nativeID : undefined
  const id = nativeID ?? testID

  if (!id && !accessibilityLabel) return undefined

  return {
    id,
    tag: getComponentName(type),
    testID,
    accessibilityLabel,
    text: getAutoText(props),
    dataset: nativeID ? { nativeID } : undefined
  }
}

function createAutoRegisteredProps(
  props: Record<string, unknown> | null | undefined,
  registration: Omit<ReactNativeMeasuredElement, 'ref'>
): Record<string, unknown> {
  const originalRef = props?.ref
  const refState: { current?: unknown } = {}
  let cleanup: (() => void) | undefined

  return {
    ...props,
    ref: (value: unknown) => {
      cleanup?.()
      cleanup = undefined
      refState.current = value
      assignRef(originalRef, value)

      if (value) {
        cleanup = registerMeasuredElement({
          ...registration,
          ref: refState
        })
      }
    }
  }
}

function assignRef(ref: unknown, value: unknown): void {
  if (!ref) return
  if (typeof ref === 'function') {
    ref(value)
    return
  }
  if (typeof ref === 'object' && 'current' in ref) {
    ;(ref as { current?: unknown }).current = value
  }
}

function getAutoText(props: Record<string, unknown>): string | undefined {
  if (typeof props.uicheckText === 'string') return props.uicheckText
  if (typeof props.accessibilityLabel === 'string') return props.accessibilityLabel
  if (typeof props.children === 'string') return props.children
  if (Array.isArray(props.children)) {
    const text = props.children.filter((child): child is string => typeof child === 'string').join('')
    return text || undefined
  }
  return undefined
}

function getComponentName(type: unknown): string {
  if (typeof type === 'string') return type
  if (typeof type === 'function') {
    const named = type as { displayName?: string; name?: string }
    return named.displayName ?? named.name ?? 'Component'
  }
  if (type && typeof type === 'object') {
    const named = type as { displayName?: string; name?: string }
    return named.displayName ?? named.name ?? 'Component'
  }
  return 'Component'
}

function measureWithRef(refValue: unknown): Promise<ReactNativeElementInfo['box'] | undefined> {
  if (!refValue || typeof refValue !== 'object') return Promise.resolve(undefined)
  const measurable = refValue as {
    measure?: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void
    measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void
  }
  if (measurable.measureInWindow) {
    return new Promise((resolve) => {
      measurable.measureInWindow?.((x, y, width, height) => resolve(createBox(x, y, width, height)))
    })
  }
  if (measurable.measure) {
    return new Promise((resolve) => {
      measurable.measure?.((_x, _y, width, height, pageX, pageY) => resolve(createBox(pageX, pageY, width, height)))
    })
  }
  return Promise.resolve(undefined)
}

function measureWithUIManager(reactNative: ReactNativeLike, refValue: unknown): Promise<ReactNativeElementInfo['box'] | undefined> {
  const handle = reactNative.findNodeHandle?.(refValue)
  if (typeof handle !== 'number') return Promise.resolve(undefined)
  if (reactNative.UIManager?.measureInWindow) {
    return new Promise((resolve) => {
      reactNative.UIManager?.measureInWindow?.(handle, (x, y, width, height) => resolve(createBox(x, y, width, height)))
    })
  }
  if (reactNative.UIManager?.measure) {
    return new Promise((resolve) => {
      reactNative.UIManager?.measure?.(handle, (_x, _y, width, height, pageX, pageY) => resolve(createBox(pageX, pageY, width, height)))
    })
  }
  return Promise.resolve(undefined)
}

function createBox(x: number, y: number, width: number, height: number): ReactNativeElementInfo['box'] {
  const left = Math.round(Number(x) || 0)
  const top = Math.round(Number(y) || 0)
  return {
    x: left,
    y: top,
    width: Math.round(Number(width) || 0),
    height: Math.round(Number(height) || 0),
    top,
    left
  }
}

async function normalizeElement(reactNative: ReactNativeLike, item: RegisteredElement): Promise<ReactNativeElementInfo | undefined> {
  const refValue = getRefValue(item.ref)
  const box = (await measureWithRef(refValue)) ?? (await measureWithUIManager(reactNative, refValue))
  if (!box) return undefined
  const visible = item.visible !== false && box.width > 0 && box.height > 0
  return {
    tag: item.tag ?? 'View',
    id: item.id,
    testID: item.testID,
    accessibilityLabel: item.accessibilityLabel,
    classes: toClasses(item.className),
    text: compactText(item.text ?? item.accessibilityLabel),
    visible,
    box,
    dataset: item.dataset
  }
}

async function inspectReactNativeElements(
  reactNative: ReactNativeLike,
  options: ReactNativeRuntimeOptions,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const includeHidden = params.includeHidden === true
  const limit = clampLimit(params.limit)
  const search = normalizeElementSearch(params)
  const elements = (await Promise.all([...registry].map((item) => normalizeElement(reactNative, item))))
    .filter((element): element is ReactNativeElementInfo => Boolean(element))
    .filter((element) => includeHidden || element.visible)
  const tree = createFilteredElementTree(search ? elements : elements.slice(0, limit), search)

  return {
    platform: 'react-native',
    os: reactNative.Platform?.OS,
    viewport: getViewportInfo(reactNative),
    count: countElementTree(tree),
    tree
  }
}

function captureReactNativePage(options: ReactNativeRuntimeOptions, params: Record<string, unknown> = {}): UiCheckScreenshotResult | Promise<UiCheckScreenshotResult> {
  if (options.screenshot) return options.screenshot(params)
  throw new Error('capture_page requires a React Native screenshot option')
}

function captureReactNativeElement(options: ReactNativeRuntimeOptions, params: Record<string, unknown> = {}): UiCheckScreenshotResult | Promise<UiCheckScreenshotResult> {
  return captureReactNativePage(options, params)
}

function createReactNativeSocketTransport(SocketCtor: ReactNativeWebSocketConstructor, url: string): UiCheckSocketTransport {
  const socket = new SocketCtor(url)
  const pendingMessages: string[] = []
  let isOpen = socket.readyState === 1
  let isClosed = false

  const flush = () => {
    isOpen = true
    while (pendingMessages.length > 0 && !isClosed) {
      sendSocketMessage(socket, pendingMessages.shift() as string)
    }
  }

  const queueMessage = (message: string) => {
    if (isClosed) return
    if (isOpen || socket.readyState === 1) {
      isOpen = true
      sendSocketMessage(socket, message)
      return
    }
    pendingMessages.push(message)
    if (pendingMessages.length > 50) pendingMessages.shift()
  }

  return {
    send: queueMessage,
    close: () => {
      isClosed = true
      pendingMessages.length = 0
      socket.close()
    },
    onOpen: (listener) =>
      addSocketListener(socket, 'open', () => {
        flush()
        listener()
      }),
    onMessage: (listener) =>
      addSocketListener(socket, 'message', (event) => {
        if (event && typeof event === 'object' && 'data' in event) listener((event as { data?: unknown }).data)
        else listener(event)
      }),
    onClose: (listener) =>
      addSocketListener(socket, 'close', (event) => {
        isClosed = true
        pendingMessages.length = 0
        listener()
      })
  }
}

function sendSocketMessage(socket: ReactNativeWebSocketLike, message: string): void {
  try {
    socket.send(message)
  } catch {
    // React Native throws INVALID_STATE_ERR when AppState/Dimensions events race
    // ahead of the WebSocket open event. The runtime will send fresh snapshots
    // after reconnect, so this should not crash the host app.
  }
}

function addSocketListener(socket: ReactNativeWebSocketLike, event: 'open' | 'message' | 'close', listener: (event?: unknown) => void): void {
  if (socket.addEventListener) {
    socket.addEventListener(event, listener)
    return
  }
  if (event === 'open') socket.onopen = () => listener()
  if (event === 'message') socket.onmessage = listener
  if (event === 'close') socket.onclose = () => listener()
}

function addLifecycleListener(source: { addEventListener?: (event: 'change', listener: () => void) => { remove?: () => void } | (() => void) | void } | undefined, listener: () => void): void {
  source?.addEventListener?.('change', listener)
}

export function createReactNativeUiCheckAdapter(reactNative: ReactNativeLike, options: ReactNativeRuntimeOptions = {}): ReactNativeUiCheckToolAdapter {
  return {
    getClientInfo: () => ({
      userAgent: reactNative.Platform?.OS,
      viewport: getViewportInfo(reactNative)
    }),
    capturePage: (params) => captureReactNativePage(options, params),
    captureElement: (params) => captureReactNativeElement(options, params),
    inspectElements: (params) => inspectReactNativeElements(reactNative, options, params)
  }
}

export function initUiCheck(options: ReactNativeUiCheckOptions = {}): void {
  const runtime = resolveReactNativeRuntime(options as ReactNativeRuntimeOptions)
  const SocketCtor = runtime.WebSocket
  if (!SocketCtor) throw new Error('initUiCheck requires WebSocket from React Native or options.WebSocket')

  const React = runtime.React
  const jsxRuntime = runtime.jsxRuntime
  const autoRegisterOptions = getAutoRegisterOptions(Boolean(React || jsxRuntime))
  installAutoRegister(React, autoRegisterOptions)
  installJsxRuntimeAutoRegister(jsxRuntime, autoRegisterOptions)

  connectUiCheckRuntime({
    socket: runtime.socket,
    adapter: createReactNativeUiCheckAdapter(runtime, runtime),
    createTransport: (url) => createReactNativeSocketTransport(SocketCtor, url),
    hooks: {
      setTimeout: (handler, timeout) => setTimeout(handler, timeout),
      clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      onFocus: (listener) => addLifecycleListener(runtime.AppState, listener),
      onResize: (listener) => addLifecycleListener(runtime.Dimensions, listener),
      resolveSocketUrl: (url) => url
    }
  })
}
