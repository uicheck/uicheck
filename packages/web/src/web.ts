import html2canvas from 'html2canvas'
import { connectUiCheckRuntime, countElementTree, createFilteredElementTree, normalizeElementSearch } from '@uicheck/core'
import type { UiCheckSocketTransport } from '@uicheck/core/protocol'
import type { UiCheckClientSnapshot, UiCheckScreenshotResult, UiCheckToolAdapter } from '@uicheck/core'
import type { ResolvedUiCheckOptions, UiCheckOptions } from './types'

interface LayoutInfo {
  tag: string
  id: string
  classes: string
  margin: string
  padding: string
  width: number
  height: number
}

interface NodeInfo {
  element: Element
  layout: LayoutInfo
  duplicateCount?: number
}

interface PositionedLabel {
  side: 'left' | 'right' | 'top' | 'bottom'
  x: number
  y: number
  width: number
}

type LabelSide = PositionedLabel['side']

interface ElementBox {
  id: string
  number: number
  x: number
  y: number
  width: number
  height: number
  markerX: number
  markerY: number
  hue: number
}

interface RectLike {
  x: number
  y: number
  width: number
  height: number
}

interface ConnectorPath {
  id: string
  d: string
  stroke: string
}

interface PositionedItem {
  preferred: number
  index: number
}

interface LabelCandidate {
  centerX: number
  centerY: number
  index: number
  scores: Record<LabelSide, number>
}

interface ViewportTransform {
  x: number
  y: number
  zoom: number
}

interface Html2CanvasOptions {
  backgroundColor: string | null
  scale: number
  useCORS: boolean
  logging: boolean
  imageTimeout?: number
  removeContainer?: boolean
  width: number
  height: number
  windowWidth: number
  windowHeight: number
  scrollX: number
  scrollY: number
  x: number
  y: number
  onclone?: (document: Document) => void
  ignoreElements?: (element: Element) => boolean
}

type Html2Canvas = (element: HTMLElement, options: Html2CanvasOptions) => Promise<HTMLCanvasElement>

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2.5

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function getBoxSpacing(styles: CSSStyleDeclaration, prefix: 'margin' | 'padding'): string {
  return [
    styles[prefix + 'Top' as keyof CSSStyleDeclaration],
    styles[prefix + 'Right' as keyof CSSStyleDeclaration],
    styles[prefix + 'Bottom' as keyof CSSStyleDeclaration],
    styles[prefix + 'Left' as keyof CSSStyleDeclaration]
  ].join(' ')
}

function hasBoxSpacing(value: string): boolean {
  return value.split(' ').some((part) => Number.parseFloat(part) !== 0)
}

function hasLayoutSpacing(layout: LayoutInfo): boolean {
  return hasBoxSpacing(layout.margin) || hasBoxSpacing(layout.padding)
}

function getLayout(element: Element): LayoutInfo {
  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id,
    classes: Array.from(element.classList).join('.') || '',
    margin: getBoxSpacing(styles, 'margin'),
    padding: getBoxSpacing(styles, 'padding'),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
}

function collectNodes(element: Element, result: NodeInfo[]): void {
  if (element.nodeType !== 1) return
  if (isUiCheckElement(element)) return
  result.push({ element, layout: getLayout(element) })
  for (let index = 0; index < element.children.length; index++) {
    collectNodes(element.children[index], result)
  }
}

function isUiCheckElement(element: Element): boolean {
  return Boolean(element.closest('[data-uicheck-internal="true"]'))
}

function buildNodeSignature(nodeInfo: NodeInfo): string {
  const { tag, classes, width, height } = nodeInfo.layout
  return [tag, classes, width, height].join('|')
}

function dedupeNodes(nodes: NodeInfo[]): NodeInfo[] {
  const deduped: NodeInfo[] = []
  const grouped = new Map<string, number>()

  for (const node of nodes) {
    const signature = buildNodeSignature(node)
    const existingIndex = grouped.get(signature)

    if (existingIndex === undefined) {
      deduped.push({ ...node, duplicateCount: 0 })
      grouped.set(signature, deduped.length - 1)
      continue
    }

    deduped[existingIndex].duplicateCount = (deduped[existingIndex].duplicateCount ?? 0) + 1
  }

  return deduped
}

function getAnchorPoint(
  side: LabelSide,
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  if (side === 'left') return { x, y: y + height / 2 }
  if (side === 'right') return { x: x + width, y: y + height / 2 }
  if (side === 'top') return { x: x + width / 2, y }
  return { x: x + width / 2, y: y + height }
}

function buildCurvePath(start: { x: number; y: number }, end: { x: number; y: number }, side: LabelSide): string {
  const offset =
    side === 'left' || side === 'right'
      ? Math.max(40, Math.abs(end.x - start.x) * 0.35)
      : Math.max(40, Math.abs(end.y - start.y) * 0.35)

  if (side === 'left') {
    return `M ${start.x} ${start.y} C ${start.x - offset} ${start.y}, ${end.x + offset} ${end.y}, ${end.x} ${end.y}`
  }
  if (side === 'right') {
    return `M ${start.x} ${start.y} C ${start.x + offset} ${start.y}, ${end.x - offset} ${end.y}, ${end.x} ${end.y}`
  }
  if (side === 'top') {
    return `M ${start.x} ${start.y} C ${start.x} ${start.y - offset}, ${end.x} ${end.y + offset}, ${end.x} ${end.y}`
  }
  return `M ${start.x} ${start.y} C ${start.x} ${start.y + offset}, ${end.x} ${end.y - offset}, ${end.x} ${end.y}`
}

function spreadAxisPositionsEvenly(
  items: PositionedItem[],
  min: number,
  max: number,
  size: number
): Array<{ index: number; value: number }> {
  if (items.length === 0) return []

  const effectiveMax = Math.max(min, max - size)
  const sorted = [...items].sort((a, b) => a.preferred - b.preferred)
  if (sorted.length === 1) {
    return [{ index: sorted[0].index, value: clamp(sorted[0].preferred, min, effectiveMax) }]
  }

  const step = (effectiveMax - min) / (sorted.length - 1)
  return sorted.map((item, index) => ({
    index: item.index,
    value: min + step * index
  }))
}

function buildRingTrackPositions(
  items: PositionedItem[],
  min: number,
  max: number,
  size: number,
  gap: number
): Array<{ index: number; value: number; track: number }> {
  if (items.length === 0) return []

  const axisLength = Math.max(1, max - min)
  const capacityPerTrack = Math.max(1, Math.floor((axisLength + gap) / (size + gap)))
  const trackCount = Math.max(1, Math.ceil(items.length / capacityPerTrack))
  const tracks: PositionedItem[][] = Array.from({ length: trackCount }, () => [])

  const sorted = [...items].sort((a, b) => a.preferred - b.preferred)
  for (let i = 0; i < sorted.length; i++) {
    tracks[i % trackCount].push(sorted[i])
  }

  const result: Array<{ index: number; value: number; track: number }> = []
  for (let track = 0; track < tracks.length; track++) {
    const placed = spreadAxisPositionsEvenly(tracks[track], min, max, size)
    for (const item of placed) {
      result.push({ ...item, track })
    }
  }

  return result
}

function getFittedViewport(width: number, height: number, contentWidth: number, contentHeight: number): ViewportTransform {
  const zoom = clamp(Math.min((width - 56) / contentWidth, (height - 56) / contentHeight), MIN_ZOOM, 1)
  return {
    x: Math.round((width - contentWidth * zoom) / 2),
    y: Math.round((height - contentHeight * zoom) / 2),
    zoom
  }
}

function buildLabelLayout(
  elemNodes: Array<{ item: { node: NodeInfo; index: number }; idx: number; rect: DOMRect }>,
  imgX: number,
  imgY: number,
  imgW: number,
  imgH: number,
  labelW: number,
  labelH: number,
  imgScale: number
): PositionedLabel[] {
  const sideMargin = 24
  const outerGap = 20
  const trackGap = 12
  const gap = 8
  const topBottomW = 190
  const screenshotCenterX = imgX + imgW / 2
  const screenshotCenterY = imgY + imgH / 2
  const positions: PositionedLabel[] = new Array(elemNodes.length)

  const groups = {
    left: [] as PositionedItem[],
    right: [] as PositionedItem[],
    top: [] as PositionedItem[],
    bottom: [] as PositionedItem[]
  }
  const oneTrackCapacity = {
    left: Math.max(1, Math.floor((imgH + gap) / (labelH + gap))),
    right: Math.max(1, Math.floor((imgH + gap) / (labelH + gap))),
    top: Math.max(1, Math.floor((imgW + gap) / (topBottomW + gap))),
    bottom: Math.max(1, Math.floor((imgW + gap) / (topBottomW + gap)))
  }
  const candidates: LabelCandidate[] = []

  for (let i = 0; i < elemNodes.length; i++) {
    const rect = elemNodes[i].rect
    const centerX = imgX + (rect.left + rect.width / 2) * imgScale
    const centerY = imgY + (rect.top + rect.height / 2) * imgScale
    const normalizedX = (centerX - screenshotCenterX) / Math.max(1, imgW / 2)
    const normalizedY = (centerY - screenshotCenterY) / Math.max(1, imgH / 2)

    candidates.push({
      index: i,
      centerX,
      centerY,
      scores: {
        left: -normalizedX + Math.abs(normalizedY) * 0.12,
        right: normalizedX + Math.abs(normalizedY) * 0.12,
        top: -normalizedY + Math.abs(normalizedX) * 0.08,
        bottom: normalizedY + Math.abs(normalizedX) * 0.08
      }
    })
  }

  const counts = { left: 0, right: 0, top: 0, bottom: 0 }
  const sides: LabelSide[] = ['left', 'right', 'top', 'bottom']
  const sortedCandidates = [...candidates].sort((a, b) => {
    const aBest = Math.max(...sides.map((side) => a.scores[side]))
    const bBest = Math.max(...sides.map((side) => b.scores[side]))
    return bBest - aBest
  })

  for (const candidate of sortedCandidates) {
    let bestSide: LabelSide = 'left'
    let bestScore = Number.NEGATIVE_INFINITY

    for (const side of sides) {
      const loadPenalty = counts[side] / oneTrackCapacity[side]
      const score = candidate.scores[side] - loadPenalty * 0.85
      if (score > bestScore) {
        bestScore = score
        bestSide = side
      }
    }

    counts[bestSide] += 1
    groups[bestSide].push({
      index: candidate.index,
      preferred:
        bestSide === 'left' || bestSide === 'right'
          ? candidate.centerY - labelH / 2
          : candidate.centerX - topBottomW / 2
    })
  }

  const sideTracks = Math.max(
    1,
    Math.ceil(groups.left.length / oneTrackCapacity.left),
    Math.ceil(groups.right.length / oneTrackCapacity.right)
  )
  const horizontalReach = sideTracks * (labelW + trackGap) + sideMargin
  const ringMinX = imgX - horizontalReach
  const ringMaxX = imgX + imgW + horizontalReach
  const leftPlaced = buildRingTrackPositions(groups.left, imgY, imgY + imgH, labelH, gap)
  const rightPlaced = buildRingTrackPositions(groups.right, imgY, imgY + imgH, labelH, gap)
  const topPlaced = buildRingTrackPositions(groups.top, ringMinX, ringMaxX, topBottomW, gap)
  const bottomPlaced = buildRingTrackPositions(groups.bottom, ringMinX, ringMaxX, topBottomW, gap)

  for (const item of leftPlaced) {
    positions[item.index] = {
      side: 'left',
      width: labelW,
      x: imgX - sideMargin - labelW - item.track * (labelW + trackGap),
      y: item.value
    }
  }
  for (const item of rightPlaced) {
    positions[item.index] = {
      side: 'right',
      width: labelW,
      x: imgX + imgW + sideMargin + item.track * (labelW + trackGap),
      y: item.value
    }
  }
  for (const item of topPlaced) {
    positions[item.index] = {
      side: 'top',
      width: topBottomW,
      x: item.value,
      y: imgY - outerGap - labelH - item.track * (labelH + trackGap)
    }
  }
  for (const item of bottomPlaced) {
    positions[item.index] = {
      side: 'bottom',
      width: topBottomW,
      x: item.value,
      y: imgY + imgH + outerGap + item.track * (labelH + trackGap)
    }
  }

  return positions
}

function createElement(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag)
  if (className) element.className = className
  return element
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
}

function withTimeout<T>(factory: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    let promise: Promise<T>
    try {
      promise = factory()
    } catch (error) {
      window.clearTimeout(timeout)
      reject(error)
      return
    }

    promise.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  })
}

function getViewportInfo(): UiCheckClientSnapshot['viewport'] {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  }
}

function compactText(value: string): string | undefined {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 160 ? `${text.slice(0, 157)}...` : text || undefined
}

function getSerializableElementInfo(element: Element): Record<string, unknown> {
  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const visible =
    rect.width > 0 &&
    rect.height > 0 &&
    styles.visibility !== 'hidden' &&
    styles.display !== 'none' &&
    Number(styles.opacity || '1') > 0

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classes: Array.from(element.classList),
    text: compactText(element.textContent ?? ''),
    role: element.getAttribute('role') ?? undefined,
    ariaLabel: element.getAttribute('aria-label') ?? undefined,
    testId: element.getAttribute('data-testid') ?? element.getAttribute('data-test-id') ?? undefined,
    href: element instanceof HTMLAnchorElement ? element.href : undefined,
    visible,
    box: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top + window.scrollY),
      left: Math.round(rect.left + window.scrollX)
    },
    style: {
      display: styles.display,
      position: styles.position,
      margin: getBoxSpacing(styles, 'margin'),
      padding: getBoxSpacing(styles, 'padding'),
      color: styles.color,
      backgroundColor: styles.backgroundColor
    }
  }
}

function inspectSerializableElements(options: ResolvedUiCheckOptions, params: Record<string, unknown> = {}): Record<string, unknown> {
  const limit = typeof params.limit === 'number' ? Math.min(Math.max(Math.floor(params.limit), 1), 500) : 80
  const includeHidden = params.includeHidden === true
  const search = normalizeElementSearch(params)
  const root = document.body
  if (!root) {
    return {
      platform: 'web',
      viewport: getViewportInfo(),
      count: 0,
      tree: [],
      error: 'document_body_not_found'
    }
  }

  const elements: Array<Record<string, unknown>> = []
  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (isUiCheckElement(element)) continue
    const info = getSerializableElementInfo(element)
    if (!includeHidden && info.visible !== true) continue
    elements.push(info)
    if (!search && elements.length >= limit) break
  }
  const tree = createFilteredElementTree(search ? elements : elements.slice(0, limit), search)

  return {
    platform: 'web',
    viewport: getViewportInfo(),
    count: countElementTree(tree),
    tree
  }
}

async function captureSerializablePage(
  html2canvas: Html2Canvas,
  options: ResolvedUiCheckOptions,
  params: Record<string, unknown> = {},
  elementsToHide: HTMLElement[] = []
): Promise<UiCheckScreenshotResult> {
  if (options.screenshot) return options.screenshot(params)
  const waitMs = typeof params.waitMs === 'number' ? params.waitMs : 0
  const timeoutMs = typeof params.timeoutMs === 'number' ? Math.max(500, params.timeoutMs) : 10_000
  const forceHtml2Canvas = params.forceHtml2Canvas === true
  if (!forceHtml2Canvas && navigator.userAgent.includes('Electron/')) {
    throw new Error('capture_page is not available in Electron renderer because html2canvas can block the page; use inspect_elements for layout debugging.')
  }
  if (waitMs > 0) await new Promise((resolve) => window.setTimeout(resolve, waitMs))

  const previousVisibility = elementsToHide.map((element) => element.style.visibility)
  for (const element of elementsToHide) {
    element.style.visibility = 'hidden'
  }

  try {
    await waitForNextPaint()
    const captureTarget = document.body ?? document.documentElement
    const canvasWidth = Math.max(1, window.innerWidth)
    const canvasHeight = Math.max(1, window.innerHeight)
    const captureScrollX = window.scrollX
    const captureScrollY = window.scrollY
    const documentWidth = Math.max(canvasWidth + captureScrollX, document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0)
    const documentHeight = Math.max(canvasHeight + captureScrollY, document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
    const screenshot = await withTimeout(
      () =>
        html2canvas(captureTarget, {
          backgroundColor: null,
          scale,
          useCORS: true,
          logging: false,
          imageTimeout: Math.min(timeoutMs, 5_000),
          removeContainer: true,
          width: canvasWidth,
          height: canvasHeight,
          windowWidth: canvasWidth,
          windowHeight: canvasHeight,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          onclone: (clonedDocument) => {
            const clonedRoot = clonedDocument.documentElement
            const clonedBody = clonedDocument.body
            clonedRoot.style.width = `${canvasWidth}px`
            clonedRoot.style.height = `${canvasHeight}px`
            clonedRoot.style.overflow = 'hidden'
            if (clonedBody) {
              clonedBody.style.width = `${documentWidth}px`
              clonedBody.style.minWidth = `${documentWidth}px`
              clonedBody.style.height = `${documentHeight}px`
              clonedBody.style.minHeight = `${documentHeight}px`
              clonedBody.style.transform = `translate(${-captureScrollX}px, ${-captureScrollY}px)`
              clonedBody.style.transformOrigin = '0 0'
            }
          },
          ignoreElements: isUiCheckElement
        }),
      timeoutMs,
      'capture_page'
    )

    return {
      width: screenshot.width,
      height: screenshot.height,
      mimeType: 'image/png',
      base64: screenshot.toDataURL('image/png').split(',')[1]
    }
  } finally {
    elementsToHide.forEach((element, index) => {
      element.style.visibility = previousVisibility[index]
    })
  }
}

function createWebSocketTransport(url: string): UiCheckSocketTransport {
  const socket = new WebSocket(url)
  return {
    send: (message) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(message)
    },
    close: () => socket.close(),
    onOpen: (listener) => socket.addEventListener('open', listener),
    onMessage: (listener) => socket.addEventListener('message', (event) => listener(event.data)),
    onClose: (listener) => socket.addEventListener('close', listener)
  }
}

export function createWebUiCheckAdapter(
  html2canvas: Html2Canvas,
  options: ResolvedUiCheckOptions = {},
  elementsToHide: HTMLElement[] = []
): UiCheckToolAdapter {
  return {
    getClientInfo: () => ({
      platform: 'web',
      userAgent: navigator.userAgent,
      viewport: getViewportInfo()
    }),
    capturePage: (params) => captureSerializablePage(html2canvas, options, params, elementsToHide),
    inspectElements: (params) => inspectSerializableElements(options, params)
  }
}

function connectUiCheckWebRuntime(html2canvas: Html2Canvas, config: ResolvedUiCheckOptions, elementsToHide: HTMLElement[]): void {
  if (typeof WebSocket === 'undefined') return
  connectUiCheckRuntime({
    socket: config.socket,
    adapter: createWebUiCheckAdapter(html2canvas, config, elementsToHide),
    createTransport: createWebSocketTransport,
    hooks: {
      setTimeout: (handler, timeout) => window.setTimeout(handler, timeout),
      clearTimeout: (timer) => window.clearTimeout(timer as number),
      onFocus: (listener) => window.addEventListener('focus', listener),
      onResize: (listener) => window.addEventListener('resize', listener),
      resolveSocketUrl: (url) => String(new URL(url, location.href))
    }
  })
}

function getRectArea(rect: RectLike): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height)
}

function getIntersectionArea(a: RectLike, b: RectLike): number {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return Math.max(0, right - left) * Math.max(0, bottom - top)
}

function getContainedOverlapRatio(a: RectLike, b: RectLike): number {
  const smallerArea = Math.min(getRectArea(a), getRectArea(b))
  if (smallerArea <= 0) return 0
  return getIntersectionArea(a, b) / smallerArea
}

function separateOverlappingBoxes(boxes: ElementBox[], imgX: number, imgY: number, imgW: number, imgH: number): void {
  const lanes = new Array(boxes.length).fill(0)
  const order = boxes
    .map((box, index) => ({ box, index, area: getRectArea(box) }))
    .sort((a, b) => b.area - a.area)

  for (let i = 0; i < order.length; i++) {
    const current = order[i]
    for (let prev = 0; prev < i; prev++) {
      const previous = order[prev]
      if (getContainedOverlapRatio(current.box, previous.box) > 0.86) {
        lanes[current.index] = Math.max(lanes[current.index], lanes[previous.index] + 1)
      }
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    const lane = lanes[i]
    if (lane === 0) continue

    const box = boxes[i]
    const maxInset = Math.max(0, Math.min(box.width, box.height) / 3)
    const inset = Math.min(lane * 5, maxInset)
    if (inset < 1) continue

    const mode = lane % 4
    if (mode === 1) {
      box.x += inset
      box.width -= inset
    } else if (mode === 2) {
      box.y += inset
      box.height -= inset
    } else {
      box.x += inset
      box.y += inset
      box.width -= inset
      box.height -= inset
    }

    box.x = clamp(box.x, imgX, imgX + imgW - 4)
    box.y = clamp(box.y, imgY, imgY + imgH - 4)
    box.width = Math.max(4, Math.min(box.width, imgX + imgW - box.x))
    box.height = Math.max(4, Math.min(box.height, imgY + imgH - box.y))
  }
}

function countMarkerCollisions(candidate: RectLike, placed: RectLike[]): number {
  return placed.reduce((count, rect) => count + (getIntersectionArea(candidate, rect) > 0 ? 1 : 0), 0)
}

function placeMarkers(boxes: ElementBox[], imgX: number, imgY: number, imgW: number, imgH: number): void {
  const placed: RectLike[] = []
  const markerH = 22

  for (const box of boxes) {
    const markerW = 22 + Math.max(0, String(box.number).length - 2) * 6
    const isSmallTarget = box.width <= markerW * 2 && box.height <= markerH * 2
    const preferred = isSmallTarget ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: box.x + 8, y: box.y + 8 }
    const rawCandidates = [
      preferred,
      { x: box.x + markerW / 2 + 3, y: box.y + markerH / 2 + 3 },
      { x: box.x + box.width - markerW / 2 - 3, y: box.y + markerH / 2 + 3 },
      { x: box.x + markerW / 2 + 3, y: box.y + box.height - markerH / 2 - 3 },
      { x: box.x + box.width - markerW / 2 - 3, y: box.y + box.height - markerH / 2 - 3 },
      { x: box.x + box.width + markerW / 2 + 4, y: box.y + markerH / 2 + 3 },
      { x: box.x - markerW / 2 - 4, y: box.y + markerH / 2 + 3 },
      { x: box.x + box.width / 2, y: box.y - markerH / 2 - 4 },
      { x: box.x + box.width / 2, y: box.y + box.height + markerH / 2 + 4 }
    ]
    const candidates = rawCandidates.map((candidate) => ({
      x: clamp(candidate.x, imgX + markerW / 2 + 2, imgX + imgW - markerW / 2 - 2),
      y: clamp(candidate.y, imgY + markerH / 2 + 2, imgY + imgH - markerH / 2 - 2)
    }))

    let best = candidates[0]
    let bestScore = Number.POSITIVE_INFINITY
    for (const candidate of candidates) {
      const rect = { x: candidate.x - markerW / 2, y: candidate.y - markerH / 2, width: markerW, height: markerH }
      const distance = Math.abs(candidate.x - preferred.x) + Math.abs(candidate.y - preferred.y)
      const score = countMarkerCollisions(rect, placed) * 10000 + distance
      if (score < bestScore) {
        best = candidate
        bestScore = score
      }
    }

    box.markerX = best.x
    box.markerY = best.y
    placed.push({ x: best.x - markerW / 2, y: best.y - markerH / 2, width: markerW, height: markerH })
  }
}

function renderDiagram(
  root: HTMLElement,
  nodes: NodeInfo[],
  screenshotDataUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  canvasLeft: number,
  canvasTop: number
): void {
  const maxPreviewW = window.innerWidth * 0.9
  const maxPreviewH = window.innerHeight * 0.9
  const imgScale = Math.min(maxPreviewW / canvasWidth, maxPreviewH / canvasHeight)
  const imgW = canvasWidth * imgScale
  const imgH = canvasHeight * imgScale
  const imgX = 60
  const imgY = 40
  const labelW = 158
  const labelH = 74

  const visible: Array<{ node: NodeInfo; index: number }> = []
  for (let i = 0; i < nodes.length; i++) {
    const rect = nodes[i].element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    visible.push({ node: nodes[i], index: i })
  }
  visible.sort((a, b) => a.node.element.getBoundingClientRect().top - b.node.element.getBoundingClientRect().top)

  const elemNodes = visible.map((item, idx) => ({ item, idx, rect: item.node.element.getBoundingClientRect() }))
  const elementBoxes: ElementBox[] = []
  const connectorPaths: ConnectorPath[] = []
  const labelPositions = buildLabelLayout(elemNodes, imgX, imgY, imgW, imgH, labelW, labelH, imgScale)

  let minX = imgX
  let minY = imgY
  let maxX = imgX + imgW
  let maxY = imgY + imgH

  for (const { item, idx, rect } of elemNodes) {
    const hue = (item.index * 47 + 200) % 360
    const x = Math.round(imgX + (rect.left - canvasLeft) * imgScale)
    const y = Math.round(imgY + (rect.top - canvasTop) * imgScale)
    const width = Math.max(Math.round(rect.width * imgScale), 4)
    const height = Math.max(Math.round(rect.height * imgScale), 4)
    const box = {
      id: 'elem-' + idx,
      number: idx + 1,
      x,
      y,
      width,
      height,
      markerX: x,
      markerY: y,
      hue
    }
    elementBoxes.push(box)
  }
  separateOverlappingBoxes(elementBoxes, imgX, imgY, imgW, imgH)
  placeMarkers(elementBoxes, imgX, imgY, imgW, imgH)

  for (let i = 0; i < elemNodes.length; i++) {
    const { item, idx } = elemNodes[i]
    const hue = (item.index * 47 + 200) % 360
    const label = labelPositions[i]
    const box = elementBoxes[i]
    const labelAnchorSide = label.side === 'left' ? 'right' : label.side === 'right' ? 'left' : label.side === 'top' ? 'bottom' : 'top'
    const start = { x: box.markerX, y: box.markerY }
    const end = getAnchorPoint(labelAnchorSide, label.x, label.y, label.width, labelH)

    minX = Math.min(minX, box.x, label.x)
    minY = Math.min(minY, box.y, label.y)
    maxX = Math.max(maxX, box.x + box.width, label.x + label.width)
    maxY = Math.max(maxY, box.y + box.height, label.y + labelH)

    connectorPaths.push({
      id: 'edge-' + idx,
      d: buildCurvePath(start, end, label.side),
      stroke: 'hsla(' + hue + ', 65%, 60%, 0.55)'
    })
  }

  const canvasPadding = 48
  const offsetX = canvasPadding - minX
  const offsetY = canvasPadding - minY
  const diagramWidth = maxX - minX + canvasPadding * 2
  const diagramHeight = maxY - minY + canvasPadding * 2
  let viewport = { x: 0, y: 0, zoom: 1 }
  let drag: { pointerId: number; startX: number; startY: number; originX: number; originY: number } | null = null

  root.innerHTML = ''
  const viewportEl = createElement('div', 'uicheck-viewport')
  const diagramEl = createElement('div', 'uicheck-diagram')
  const controls = createElement('div', 'uicheck-controls')
  controls.innerHTML = '<button type="button" data-action="in">+</button><button type="button" data-action="out">-</button><button type="button" data-action="fit">Fit</button>'
  root.append(viewportEl)
  viewportEl.append(diagramEl, controls)

  diagramEl.style.width = `${diagramWidth}px`
  diagramEl.style.height = `${diagramHeight}px`

  function applyViewport(): void {
    diagramEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
    viewportEl.style.backgroundSize = `${20 * viewport.zoom}px ${20 * viewport.zoom}px`
    viewportEl.style.backgroundPosition = `${viewport.x}px ${viewport.y}px`
  }

  function fitViewport(): void {
    viewport = getFittedViewport(viewportEl.clientWidth, viewportEl.clientHeight, diagramWidth, diagramHeight)
    applyViewport()
  }

  function scheduleFitViewport(): void {
    window.requestAnimationFrame(() => window.requestAnimationFrame(fitViewport))
  }

  function updateZoom(nextZoom: number, originX?: number, originY?: number): void {
    const rect = viewportEl.getBoundingClientRect()
    const centerX = originX ?? rect.width / 2
    const centerY = originY ?? rect.height / 2
    const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    const worldX = (centerX - viewport.x) / viewport.zoom
    const worldY = (centerY - viewport.y) / viewport.zoom
    viewport = { x: centerX - worldX * zoom, y: centerY - worldY * zoom, zoom }
    applyViewport()
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(diagramWidth))
  svg.setAttribute('height', String(diagramHeight))
  svg.classList.add('uicheck-svg')
  for (const path of connectorPaths) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    element.setAttribute('d', path.d)
    element.setAttribute('fill', 'none')
    element.setAttribute('stroke', path.stroke)
    element.setAttribute('stroke-linecap', 'round')
    element.setAttribute('stroke-width', '2')
    element.setAttribute('transform', `translate(${offsetX} ${offsetY})`)
    svg.appendChild(element)
  }
  diagramEl.appendChild(svg)

  const image = document.createElement('img')
  image.src = screenshotDataUrl
  image.alt = ''
  image.className = 'uicheck-screenshot'
  image.style.left = `${imgX + offsetX}px`
  image.style.top = `${imgY + offsetY}px`
  image.style.width = `${imgW}px`
  image.style.height = `${imgH}px`
  image.addEventListener('load', scheduleFitViewport)
  diagramEl.appendChild(image)

  for (const box of elementBoxes) {
    const element = createElement('div', 'uicheck-element-box')
    element.style.left = `${box.x + offsetX}px`
    element.style.top = `${box.y + offsetY}px`
    element.style.width = `${box.width}px`
    element.style.height = `${box.height}px`
    element.style.background = `hsla(${box.hue},65%,60%,0.06)`
    element.style.borderColor = `hsla(${box.hue},65%,60%,0.5)`
    diagramEl.appendChild(element)

    const marker = createElement('div', 'uicheck-element-marker')
    marker.textContent = String(box.number)
    marker.style.left = `${box.markerX + offsetX}px`
    marker.style.top = `${box.markerY + offsetY}px`
    marker.style.background = `hsl(${box.hue},78%,45%)`
    diagramEl.appendChild(marker)
  }

  for (const { item, idx } of elemNodes) {
    const label = labelPositions[idx]
    const box = elementBoxes[idx]
    const showMargin = hasBoxSpacing(item.node.layout.margin)
    const showPadding = hasBoxSpacing(item.node.layout.padding)
    const card = createElement('div', 'uicheck-label-card')
    card.style.left = `${label.x + offsetX}px`
    card.style.top = `${label.y + offsetY}px`
    card.style.width = `${label.width}px`
    card.style.height = `${labelH}px`
    card.style.borderLeftColor = `hsl(${box.hue},78%,52%)`

    card.innerHTML = [
      '<div class="uicheck-card-title">',
      `<span class="uicheck-card-number" style="background:hsl(${box.hue},78%,45%)">${box.number}</span>`,
      `<span class="uicheck-card-tag">${escapeHtml(item.node.layout.tag)}${item.node.layout.id ? '#' + escapeHtml(item.node.layout.id) : ''}</span>`,
      '</div>',
      item.node.layout.classes ? `<div class="uicheck-card-class">.${escapeHtml(item.node.layout.classes)}</div>` : '',
      '<div class="uicheck-card-meta">',
      `<span>${item.node.layout.width}x${item.node.layout.height}</span>`,
      item.node.duplicateCount ? `<span class="uicheck-card-similar">+${item.node.duplicateCount} similar</span>` : '',
      '</div>',
      showMargin ? `<div class="uicheck-card-margin">m: ${escapeHtml(item.node.layout.margin)}</div>` : '',
      showPadding ? `<div class="uicheck-card-padding">p: ${escapeHtml(item.node.layout.padding)}</div>` : ''
    ].join('')
    diagramEl.appendChild(card)
  }

  viewportEl.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      const rect = viewportEl.getBoundingClientRect()
      const originX = event.clientX - rect.left
      const originY = event.clientY - rect.top
      if (event.ctrlKey || event.metaKey) {
        updateZoom(viewport.zoom * Math.exp(-event.deltaY / 320), originX, originY)
        return
      }
      viewport = { ...viewport, x: viewport.x - event.deltaX, y: viewport.y - event.deltaY }
      applyViewport()
    },
    { passive: false }
  )

  viewportEl.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    viewportEl.setPointerCapture(event.pointerId)
    drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y }
  })
  viewportEl.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    viewport = { ...viewport, x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }
    applyViewport()
  })
  viewportEl.addEventListener('pointerup', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    drag = null
    viewportEl.releasePointerCapture(event.pointerId)
  })
  viewportEl.addEventListener('pointercancel', () => {
    drag = null
  })
  controls.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLButtonElement)) return
    if (target.dataset.action === 'in') updateZoom(viewport.zoom * 1.2)
    if (target.dataset.action === 'out') updateZoom(viewport.zoom / 1.2)
    if (target.dataset.action === 'fit') scheduleFitViewport()
  })
  window.addEventListener('resize', scheduleFitViewport, { once: true })
  scheduleFitViewport()
}

export function initUiCheck(config: UiCheckOptions = {}): void {
  connectUiCheckWebRuntime(html2canvas, config, [])
}
