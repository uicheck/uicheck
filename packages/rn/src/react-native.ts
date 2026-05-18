import { connectUiCheckRuntime } from '@uicheck/core'
import type { UiCheckSocketTransport } from '@uicheck/core/protocol'
import type { UiCheckClientSnapshot, UiCheckScreenshotResult, UiCheckSocketOptions, UiCheckToolAdapter } from '@uicheck/core'

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

export interface ReactNativeUiCheckAutoRegisterOptions {
  enabled?: boolean
  includeProps?: Array<'testID' | 'accessibilityLabel' | 'nativeID'>
}

export type ReactNativeRef =
  | {
      current?: unknown
    }
  | unknown

export interface ReactNativeElementRegistration {
  ref: ReactNativeRef
  id?: string
  tag?: string
  selector?: string
  testID?: string
  text?: string
  accessibilityLabel?: string
  className?: string
  visible?: boolean
  dataset?: Record<string, unknown>
}

export interface ReactNativeUiCheckOptions {
  socket?: UiCheckSocketOptions
  title?: string
  route?: string
  platform?: string
  WebSocket?: ReactNativeWebSocketConstructor
  React?: ReactNativeReactLike
  jsxRuntime?: ReactNativeJsxRuntimeLike
  autoRegister?: boolean | ReactNativeUiCheckAutoRegisterOptions
  screenshot?(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
}

interface RegisteredElement extends ReactNativeElementRegistration {
  uid: number
}

interface ReactNativeElementInfo {
  tag: string
  selector: string
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

export function registerReactNativeUiCheckElement(registration: ReactNativeElementRegistration): () => void {
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

function createSelector(item: RegisteredElement): string {
  if (item.selector) return item.selector
  if (item.id) return `#${item.id}`
  if (item.testID) return `[testID="${item.testID}"]`
  if (item.accessibilityLabel) return `[accessibilityLabel="${item.accessibilityLabel}"]`
  return `${item.tag ?? 'View'}:registered(${item.uid})`
}

function matchesSelector(item: RegisteredElement, selector: string): boolean {
  if (!selector || selector === '*') return true
  return (
    item.selector === selector ||
    item.id === selector.replace(/^#/, '') ||
    item.testID === selector ||
    item.tag === selector ||
    createSelector(item) === selector
  )
}

function toClasses(className: string | undefined): string[] {
  return className?.split(/\s+/).filter(Boolean) ?? []
}

function getAutoRegisterOptions(options: ReactNativeUiCheckOptions): ReactNativeUiCheckAutoRegisterOptions | undefined {
  if (options.autoRegister === true) return { enabled: true }
  if (typeof options.autoRegister === 'object') return { enabled: options.autoRegister.enabled !== false, includeProps: options.autoRegister.includeProps }
  return undefined
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
): Omit<ReactNativeElementRegistration, 'ref'> | undefined {
  if (!props) return undefined
  const includeProps = options.includeProps ?? ['testID', 'accessibilityLabel', 'nativeID']
  const testID = includeProps.includes('testID') && typeof props.testID === 'string' ? props.testID : undefined
  const accessibilityLabel =
    includeProps.includes('accessibilityLabel') && typeof props.accessibilityLabel === 'string' ? props.accessibilityLabel : undefined
  const nativeID = includeProps.includes('nativeID') && typeof props.nativeID === 'string' ? props.nativeID : undefined
  const id = nativeID ?? testID

  if (!id && !accessibilityLabel) return undefined

  return {
    id,
    tag: getComponentName(type),
    selector: testID ? `[testID="${testID}"]` : nativeID ? `#${nativeID}` : `[accessibilityLabel="${accessibilityLabel}"]`,
    testID,
    accessibilityLabel,
    text: getAutoText(props),
    dataset: nativeID ? { nativeID } : undefined
  }
}

function createAutoRegisteredProps(
  props: Record<string, unknown> | null | undefined,
  registration: Omit<ReactNativeElementRegistration, 'ref'>
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
        cleanup = registerReactNativeUiCheckElement({
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
    selector: createSelector(item),
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
  options: ReactNativeUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const selector = typeof params.selector === 'string' ? params.selector : '*'
  const includeHidden = params.includeHidden === true
  const limit = clampLimit(params.limit)
  const elements = (
    await Promise.all([...registry].filter((item) => matchesSelector(item, selector)).map((item) => normalizeElement(reactNative, item)))
  )
    .filter((element): element is ReactNativeElementInfo => Boolean(element))
    .filter((element) => includeHidden || element.visible)
    .slice(0, limit)

  return {
    platform: 'react-native',
    os: options.platform ?? reactNative.Platform?.OS,
    url: options.route,
    title: options.title,
    viewport: getViewportInfo(reactNative),
    count: elements.length,
    elements
  }
}

function containsPoint(element: ReactNativeElementInfo, x: number, y: number): boolean {
  return (
    x >= element.box.x &&
    x <= element.box.x + element.box.width &&
    y >= element.box.y &&
    y <= element.box.y + element.box.height
  )
}

async function getReactNativeElementAtPoint(
  reactNative: ReactNativeLike,
  options: ReactNativeUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const x = typeof params.x === 'number' ? params.x : 0
  const y = typeof params.y === 'number' ? params.y : 0
  const result = await inspectReactNativeElements(reactNative, options, { selector: params.selector, includeHidden: false, limit: 500 })
  const elements = Array.isArray(result.elements) ? (result.elements as ReactNativeElementInfo[]) : []
  const element =
    elements
      .filter((item) => containsPoint(item, x, y))
      .sort((a, b) => a.box.width * a.box.height - b.box.width * b.box.height)[0] ?? null

  return {
    platform: 'react-native',
    os: options.platform ?? reactNative.Platform?.OS,
    url: options.route,
    title: options.title,
    viewport: result.viewport,
    point: { x, y },
    element,
    ancestors: []
  }
}

function captureReactNativePage(options: ReactNativeUiCheckOptions, params: Record<string, unknown> = {}): UiCheckScreenshotResult | Promise<UiCheckScreenshotResult> {
  if (options.screenshot) return options.screenshot(params)
  throw new Error('capture_page requires a React Native screenshot option')
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

export function createReactNativeUiCheckAdapter(reactNative: ReactNativeLike, options: ReactNativeUiCheckOptions = {}): UiCheckToolAdapter {
  return {
    getClientInfo: () => ({
      url: options.route,
      title: options.title,
      userAgent: options.platform ?? reactNative.Platform?.OS,
      viewport: getViewportInfo(reactNative)
    }),
    capturePage: (params) => captureReactNativePage(options, params),
    inspectElements: (params) => inspectReactNativeElements(reactNative, options, params),
    getElementAtPoint: (params) => getReactNativeElementAtPoint(reactNative, options, params)
  }
}

export function installReactNativeUiCheck(reactNative: ReactNativeLike, options: ReactNativeUiCheckOptions = {}): void {
  const SocketCtor = options.WebSocket ?? reactNative.WebSocket ?? (globalThis.WebSocket as unknown as ReactNativeWebSocketConstructor | undefined)
  if (!SocketCtor) throw new Error('installReactNativeUiCheck requires WebSocket from React Native or options.WebSocket')

  const autoRegisterOptions = getAutoRegisterOptions(options)
  installAutoRegister(options.React ?? reactNative.React, autoRegisterOptions)
  installJsxRuntimeAutoRegister(options.jsxRuntime ?? reactNative.jsxRuntime, autoRegisterOptions)

  connectUiCheckRuntime({
    socket: options.socket,
    adapter: createReactNativeUiCheckAdapter(reactNative, options),
    createTransport: (url) => createReactNativeSocketTransport(SocketCtor, url),
    hooks: {
      setTimeout: (handler, timeout) => setTimeout(handler, timeout),
      clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      onFocus: (listener) => addLifecycleListener(reactNative.AppState, listener),
      onResize: (listener) => addLifecycleListener(reactNative.Dimensions, listener),
      resolveSocketUrl: (url) => url
    }
  })
}
