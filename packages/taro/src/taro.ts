import { connectUiCheckRuntime } from '@uicheck/core'
import type { UiCheckSocketTransport } from '@uicheck/core/protocol'
import type { UiCheckClientSnapshot, UiCheckScreenshotResult, UiCheckSocketOptions, UiCheckToolAdapter } from '@uicheck/core'

export interface TaroSocketTask {
  send(options: { data: string }): void
  close(): void
  onOpen(listener: () => void): void
  onMessage(listener: (message: { data?: unknown } | unknown) => void): void
  onClose(listener: () => void): void
}

export interface TaroSelectorQueryNode {
  id?: string
  dataset?: Record<string, unknown>
  left?: number
  top?: number
  right?: number
  bottom?: number
  width?: number
  height?: number
  class?: string
  className?: string
  scrollLeft?: number
  scrollTop?: number
  [key: string]: unknown
}

export interface TaroSelectorQueryNodeHandle {
  fields(fields: Record<string, unknown>, callback: (nodes: TaroSelectorQueryNode[]) => void): TaroSelectorQuery
  boundingClientRect(callback: (nodes: TaroSelectorQueryNode[]) => void): TaroSelectorQuery
}

export interface TaroSelectorViewportHandle {
  scrollOffset(callback: (result: { scrollLeft?: number; scrollTop?: number }) => void): TaroSelectorQuery
}

export interface TaroSelectorQuery {
  in?(page: unknown): TaroSelectorQuery
  selectAll(selector: string): TaroSelectorQueryNodeHandle
  selectViewport(): TaroSelectorViewportHandle
  exec(callback?: () => void): void
}

export interface TaroFileSystemManager {
  readFile(options: {
    filePath: string
    encoding: 'base64'
    success: (result: { data: string }) => void
    fail?: (error: unknown) => void
  }): void
}

export interface TaroLike {
  connectSocket(options: { url: string; success?: () => void; fail?: (error: unknown) => void }): TaroSocketTask
  createSelectorQuery(): TaroSelectorQuery
  getSystemInfoSync?(): Partial<{ windowWidth: number; windowHeight: number; pixelRatio: number }>
  getCurrentPages?(): Array<{ route?: string; options?: Record<string, unknown> }>
  canvasToTempFilePath?(
    options: { canvasId: string; success?: (result: { tempFilePath: string }) => void; fail?: (error: unknown) => void },
    instance?: unknown
  ): void
  getFileSystemManager?(): TaroFileSystemManager
}

export interface TaroUiCheckOptions {
  socket?: UiCheckSocketOptions
  selector?: string
  page?: unknown
  route?: string
  title?: string
  canvasId?: string
  screenshot?(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
}

interface TaroElementInfo {
  tag: string
  selector: string
  id?: string
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

function clampLimit(value: unknown): number {
  return typeof value === 'number' ? Math.min(Math.max(Math.floor(value), 1), 500) : 80
}

function getDatasetString(dataset: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = dataset?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function compactText(value: string | undefined): string | undefined {
  if (!value) return undefined
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 160 ? `${text.slice(0, 157)}...` : text || undefined
}

function getCurrentRoute(taro: TaroLike, options: TaroUiCheckOptions): string | undefined {
  if (options.route) return options.route
  const pages = taro.getCurrentPages?.()
  const current = pages?.[pages.length - 1]
  if (!current?.route) return undefined
  const query = current.options ? new URLSearchParams(toStringRecord(current.options)).toString() : ''
  return query ? `${current.route}?${query}` : current.route
}

function toStringRecord(input: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) result[key] = String(value)
  }
  return result
}

function getViewportInfo(taro: TaroLike, scroll: { scrollLeft?: number; scrollTop?: number } = {}): UiCheckClientSnapshot['viewport'] {
  const info = taro.getSystemInfoSync?.() ?? {}
  return {
    width: Math.round(info.windowWidth ?? 0),
    height: Math.round(info.windowHeight ?? 0),
    devicePixelRatio: info.pixelRatio ?? 1,
    scrollX: Math.round(scroll.scrollLeft ?? 0),
    scrollY: Math.round(scroll.scrollTop ?? 0)
  }
}

function createSelector(node: TaroSelectorQueryNode, fallback: string): string {
  if (node.id) return `#${node.id}`
  const testId = getDatasetString(node.dataset, ['testid', 'testId', 'testID', 'test-id'])
  if (testId) return `[data-testid="${testId}"]`
  return fallback
}

function normalizeNode(node: TaroSelectorQueryNode, fallbackSelector: string): TaroElementInfo {
  const dataset = node.dataset
  const width = Math.round(Number(node.width ?? 0))
  const height = Math.round(Number(node.height ?? 0))
  const left = Math.round(Number(node.left ?? 0))
  const top = Math.round(Number(node.top ?? 0))
  const classValue = typeof node.className === 'string' ? node.className : typeof node.class === 'string' ? node.class : ''
  return {
    tag: getDatasetString(dataset, ['uicheckTag', 'tag', 'type']) ?? 'node',
    selector: createSelector(node, fallbackSelector),
    id: node.id,
    classes: classValue.split(/\s+/).filter(Boolean),
    text: compactText(getDatasetString(dataset, ['uicheckText', 'text', 'label', 'title'])),
    visible: width > 0 && height > 0 && node.hidden !== true,
    box: {
      x: left,
      y: top,
      width,
      height,
      top,
      left
    },
    dataset
  }
}

function queryElements(
  taro: TaroLike,
  options: TaroUiCheckOptions,
  selector: string
): Promise<{ nodes: TaroSelectorQueryNode[]; scroll: { scrollLeft?: number; scrollTop?: number } }> {
  return new Promise((resolve) => {
    const query = taro.createSelectorQuery()
    if (options.page && query.in) query.in(options.page)
    let nodes: TaroSelectorQueryNode[] = []
    let scroll: { scrollLeft?: number; scrollTop?: number } = {}
    query
      .selectAll(selector)
      .fields(
        {
          id: true,
          dataset: true,
          rect: true,
          size: true,
          scrollOffset: true,
          properties: ['class', 'className', 'hidden']
        },
        (result) => {
          nodes = Array.isArray(result) ? result : []
        }
      )
    query.selectViewport().scrollOffset((result) => {
      scroll = result ?? {}
    })
    query.exec(() => resolve({ nodes, scroll }))
  })
}

function containsPoint(element: TaroElementInfo, x: number, y: number): boolean {
  return (
    x >= element.box.x &&
    x <= element.box.x + element.box.width &&
    y >= element.box.y &&
    y <= element.box.y + element.box.height
  )
}

async function inspectTaroElements(
  taro: TaroLike,
  options: TaroUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const selector = typeof params.selector === 'string' ? params.selector : options.selector ?? '*'
  const includeHidden = params.includeHidden === true
  const limit = clampLimit(params.limit)
  const { nodes, scroll } = await queryElements(taro, options, selector)
  const elements = nodes
    .map((node) => normalizeNode(node, selector))
    .filter((element) => includeHidden || element.visible)
    .slice(0, limit)

  return {
    platform: 'taro',
    url: getCurrentRoute(taro, options),
    title: options.title,
    viewport: getViewportInfo(taro, scroll),
    count: elements.length,
    elements
  }
}

async function getTaroElementAtPoint(
  taro: TaroLike,
  options: TaroUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const x = typeof params.x === 'number' ? params.x : 0
  const y = typeof params.y === 'number' ? params.y : 0
  const result = await inspectTaroElements(taro, options, { selector: params.selector, includeHidden: false, limit: 500 })
  const elements = Array.isArray(result.elements) ? (result.elements as TaroElementInfo[]) : []
  const element =
    elements
      .filter((item) => containsPoint(item, x, y))
      .sort((a, b) => a.box.width * a.box.height - b.box.width * b.box.height)[0] ?? null

  return {
    platform: 'taro',
    url: getCurrentRoute(taro, options),
    title: options.title,
    viewport: result.viewport,
    point: { x, y },
    element,
    ancestors: []
  }
}

async function captureTaroPage(
  taro: TaroLike,
  options: TaroUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<UiCheckScreenshotResult> {
  if (options.screenshot) return options.screenshot(params)
  if (!options.canvasId || !taro.canvasToTempFilePath || !taro.getFileSystemManager) {
    throw new Error('capture_page requires a Taro screenshot option or canvasId')
  }

  const filePath = await new Promise<string>((resolve, reject) => {
    taro.canvasToTempFilePath?.(
      {
        canvasId: options.canvasId as string,
        success: (result) => resolve(result.tempFilePath),
        fail: reject
      },
      options.page
    )
  })
  const base64 = await new Promise<string>((resolve, reject) => {
    taro.getFileSystemManager?.().readFile({
      filePath,
      encoding: 'base64',
      success: (result) => resolve(result.data),
      fail: reject
    })
  })

  return {
    url: getCurrentRoute(taro, options),
    title: options.title,
    mimeType: 'image/png',
    base64
  }
}

function createTaroSocketTransport(taro: TaroLike, url: string): UiCheckSocketTransport {
  const socket = taro.connectSocket({ url })
  return {
    send: (message) => socket.send({ data: message }),
    close: () => socket.close(),
    onOpen: (listener) => socket.onOpen(listener),
    onMessage: (listener) =>
      socket.onMessage((message) => {
        if (message && typeof message === 'object' && 'data' in message) listener((message as { data?: unknown }).data)
        else listener(message)
      }),
    onClose: (listener) => socket.onClose(listener)
  }
}

export function createTaroUiCheckAdapter(taro: TaroLike, options: TaroUiCheckOptions = {}): UiCheckToolAdapter {
  return {
    getClientInfo: () => ({
      url: getCurrentRoute(taro, options),
      title: options.title,
      viewport: getViewportInfo(taro)
    }),
    capturePage: (params) => captureTaroPage(taro, options, params),
    inspectElements: (params) => inspectTaroElements(taro, options, params),
    getElementAtPoint: (params) => getTaroElementAtPoint(taro, options, params)
  }
}

export function installTaroUiCheck(taro: TaroLike, options: TaroUiCheckOptions = {}): void {
  connectUiCheckRuntime({
    socket: options.socket,
    adapter: createTaroUiCheckAdapter(taro, options),
    createTransport: (url) => createTaroSocketTransport(taro, url),
    hooks: {
      setTimeout: (handler, timeout) => setTimeout(handler, timeout),
      clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      resolveSocketUrl: (url) => url
    }
  })
}
