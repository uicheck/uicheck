import { connectUiCheckRuntime, createElementTree } from '@uicheck/core'
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
  exec(callback?: (result?: unknown[]) => void): void
}

export interface TaroLike {
  connectSocket(options: { url: string; success?: () => void; fail?: (error: unknown) => void }): unknown
  createSelectorQuery(): unknown
  getSystemInfoSync?(): Partial<{ windowWidth: number; windowHeight: number; pixelRatio: number }>
}

export interface TaroUiCheckOptions {
  taro: TaroLike
  socket?: UiCheckSocketOptions
  screenshot?(params?: Record<string, unknown>): Promise<UiCheckScreenshotResult> | UiCheckScreenshotResult
}

export type UiCheckOptions = TaroUiCheckOptions

interface TaroElementInfo {
  tag: string
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

function normalizeNode(node: TaroSelectorQueryNode): TaroElementInfo {
  const dataset = node.dataset
  const width = Math.round(Number(node.width ?? 0))
  const height = Math.round(Number(node.height ?? 0))
  const left = Math.round(Number(node.left ?? 0))
  const top = Math.round(Number(node.top ?? 0))
  const classValue = typeof node.className === 'string' ? node.className : typeof node.class === 'string' ? node.class : ''
  return {
    tag: getDatasetString(dataset, ['uicheckTag', 'tag', 'type']) ?? 'node',
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
  selector: string
): Promise<{ nodes: TaroSelectorQueryNode[]; scroll: { scrollLeft?: number; scrollTop?: number } }> {
  return new Promise((resolve) => {
    const query = taro.createSelectorQuery() as TaroSelectorQuery
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
    query.exec((result) => {
      if (Array.isArray(result)) {
        const execNodes = result[0]
        const execScroll = result[1]
        if (Array.isArray(execNodes)) nodes = execNodes
        if (execScroll && typeof execScroll === 'object') scroll = execScroll as { scrollLeft?: number; scrollTop?: number }
      }
      resolve({ nodes, scroll })
    })
  })
}

async function inspectTaroElements(
  taro: TaroLike,
  options: TaroUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const includeHidden = params.includeHidden === true
  const limit = clampLimit(params.limit)
  const { nodes, scroll } = await queryElements(taro, '*')
  const elements = nodes
    .map((node) => normalizeNode(node))
    .filter((element) => includeHidden || element.visible)
    .slice(0, limit)

  return {
    platform: 'taro',
    viewport: getViewportInfo(taro, scroll),
    count: elements.length,
    tree: createElementTree(elements)
  }
}

async function captureTaroPage(
  taro: TaroLike,
  options: TaroUiCheckOptions,
  params: Record<string, unknown> = {}
): Promise<UiCheckScreenshotResult> {
  if (options.screenshot) return options.screenshot(params)
  throw new Error('capture_page requires a Taro screenshot option')
}

function createTaroSocketTransport(taro: TaroLike, url: string): UiCheckSocketTransport {
  const pendingMessages: string[] = []
  let socket: TaroSocketTask | undefined
  let closed = false

  const bindSocket = (task: TaroSocketTask) => {
    if (closed) {
      task.close()
      return
    }
    socket = task
    while (pendingMessages.length > 0) {
      task.send({ data: pendingMessages.shift() as string })
    }
  }

  const socketPromise = Promise.resolve(taro.connectSocket({ url }) as TaroSocketTask | Promise<TaroSocketTask>)
  void socketPromise.then(bindSocket)

  return {
    send: (message) => {
      if (socket) socket.send({ data: message })
      else pendingMessages.push(message)
    },
    close: () => {
      closed = true
      pendingMessages.length = 0
      socket?.close()
    },
    onOpen: (listener) => {
      void socketPromise.then((task) => task.onOpen(listener))
    },
    onMessage: (listener) =>
      void socketPromise.then((task) =>
        task.onMessage((message) => {
          if (message && typeof message === 'object' && 'data' in message) listener(normalizeSocketMessageData((message as { data?: unknown }).data))
          else listener(message)
        })
      ),
    onClose: (listener) => {
      void socketPromise.then((task) =>
        task.onClose(() => {
          closed = true
          pendingMessages.length = 0
          listener()
        })
      )
    }
  }
}

function normalizeSocketMessageData(data: unknown): unknown {
  if (data instanceof ArrayBuffer) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(data)
    return String.fromCharCode(...new Uint8Array(data))
  }
  return data
}

export function createTaroUiCheckAdapter(options: TaroUiCheckOptions): UiCheckToolAdapter {
  const { taro } = options
  return {
    getClientInfo: () => ({
      viewport: getViewportInfo(taro)
    }),
    capturePage: (params) => captureTaroPage(taro, options, params),
    inspectElements: (params) => inspectTaroElements(taro, options, params)
  }
}

export function initUiCheck(options: TaroUiCheckOptions): void {
  const { taro } = options
  connectUiCheckRuntime({
    socket: options.socket,
    adapter: createTaroUiCheckAdapter(options),
    createTransport: (url) => createTaroSocketTransport(taro, url),
    hooks: {
      setTimeout: (handler, timeout) => setTimeout(handler, timeout),
      clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      resolveSocketUrl: (url) => url
    }
  })
}
