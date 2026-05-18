export interface UiCheckEvidenceElement {
  id: string
  selector: string
  tag: string
  text?: string
  box: UiCheckEvidenceRect
  meta?: string[]
  selected?: boolean
}

export interface UiCheckEvidenceScreenshot {
  title: string
  route?: string
  platform: string
  width: number
  height: number
  contentHtml?: string
  imageBase64?: string
  mimeType?: string
}

export interface UiCheckEvidenceOptions {
  title: string
  subtitle: string
  mode: 'desktop' | 'phone'
  theme: {
    background: string
    nav: string
    accent: string
    soft: string
  }
  screenshot: UiCheckEvidenceScreenshot
  elements: UiCheckEvidenceElement[]
}

export interface UiCheckEvidenceRect {
  x: number
  y: number
  width: number
  height: number
}

export type UiCheckEvidenceLabelSide = 'left' | 'right' | 'top' | 'bottom'

export interface UiCheckEvidenceLabelPosition {
  side: UiCheckEvidenceLabelSide
  x: number
  y: number
  width: number
}

export interface UiCheckEvidenceMetrics {
  width: number
  height: number
  shotX: number
  shotY: number
  shotWidth: number
  shotHeight: number
  scale: number
  labelWidth: number
  labelHeight: number
}

export interface UiCheckEvidenceLayoutItem {
  item: UiCheckEvidenceElement
  index: number
  color: string
  box: UiCheckEvidenceRect
  label: UiCheckEvidenceLabelPosition
  marker: {
    x: number
    y: number
  }
  connectorPath: string
}

export interface UiCheckEvidenceLayout {
  metrics: UiCheckEvidenceMetrics
  items: UiCheckEvidenceLayoutItem[]
}

const palette = [
  '#2563eb',
  '#db2777',
  '#0891b2',
  '#16a34a',
  '#ea580c',
  '#7c3aed',
  '#0d9488',
  '#ca8a04',
  '#dc2626',
  '#65a30d',
  '#9333ea',
  '#0284c7'
]

export function createUiCheckEvidenceLayout(
  options: UiCheckEvidenceOptions,
  boxes?: Array<UiCheckEvidenceRect | undefined>
): UiCheckEvidenceLayout {
  const metrics = getUiCheckEvidenceMetrics(options)
  const items = options.elements.map((item, index) => {
    const box = boxes?.[index] ?? getUiCheckEvidenceScaledBox(item, metrics)
    const label = getUiCheckEvidenceLabelPosition(index, options, metrics)
    const marker = getUiCheckEvidenceMarkerPosition(box)
    const connectorPath = buildUiCheckEvidenceConnectorPath(getUiCheckEvidenceLabelAnchor(label, marker), marker, label.side)

    return {
      item,
      index,
      color: getUiCheckEvidenceColor(index),
      box,
      label,
      marker,
      connectorPath
    }
  })

  return { metrics, items }
}

export function getUiCheckEvidenceColor(index: number): string {
  return palette[index % palette.length]
}

export function getUiCheckEvidenceMetrics(options: UiCheckEvidenceOptions): UiCheckEvidenceMetrics {
  const width = options.mode === 'desktop' ? 1440 : 1120
  const height = options.mode === 'desktop' ? 900 : 900
  const maxShotWidth = options.mode === 'desktop' ? 850 : 310
  const maxShotHeight = options.mode === 'desktop' ? 620 : 620
  const scale = Math.min(maxShotWidth / options.screenshot.width, maxShotHeight / options.screenshot.height)
  const shotWidth = Math.round(options.screenshot.width * scale)
  const shotHeight = Math.round(options.screenshot.height * scale)

  return {
    width,
    height,
    shotX: Math.round((width - shotWidth) / 2),
    shotY: Math.round((height - shotHeight) / 2 + (options.mode === 'desktop' ? 18 : 20)),
    shotWidth,
    shotHeight,
    scale,
    labelWidth: options.mode === 'desktop' ? 210 : 190,
    labelHeight: 82
  }
}

export function getUiCheckEvidenceScaledBox(item: UiCheckEvidenceElement, metrics: UiCheckEvidenceMetrics): UiCheckEvidenceRect {
  return {
    x: Math.round(metrics.shotX + item.box.x * metrics.scale),
    y: Math.round(metrics.shotY + item.box.y * metrics.scale),
    width: Math.max(6, Math.round(item.box.width * metrics.scale)),
    height: Math.max(6, Math.round(item.box.height * metrics.scale))
  }
}

export function getUiCheckEvidenceMarkerPosition(box: UiCheckEvidenceRect): { x: number; y: number } {
  return {
    x: clamp(box.x + 14, box.x + 12, box.x + Math.max(12, box.width - 12)),
    y: clamp(box.y + 14, box.y + 12, box.y + Math.max(12, box.height - 12))
  }
}

export function getUiCheckEvidenceLabelPosition(
  index: number,
  options: UiCheckEvidenceOptions,
  metrics: UiCheckEvidenceMetrics
): UiCheckEvidenceLabelPosition {
  const count = options.elements.length
  const side = pickSide(index, count)
  const gutter = options.mode === 'desktop' ? 34 : 24
  const sideGap = 18
  const topY = options.mode === 'desktop' ? 82 : 72
  const bottomY = metrics.height - metrics.labelHeight - 24

  if (side === 'left' || side === 'right') {
    const sideItems = indexesForSide(count, side)
    const rank = sideItems.indexOf(index)
    const minY = topY + 4
    const maxY = metrics.height - metrics.labelHeight - 32
    return {
      side,
      x: side === 'left' ? gutter : metrics.width - gutter - metrics.labelWidth,
      y: spread(rank, sideItems.length, minY, maxY),
      width: metrics.labelWidth
    }
  }

  const sideItems = indexesForSide(count, side)
  const rank = sideItems.indexOf(index)
  const minX = gutter + metrics.labelWidth + sideGap * 2
  const maxX = metrics.width - gutter - metrics.labelWidth * 2 - sideGap * 2
  return {
    side,
    x: spread(rank, sideItems.length, minX, maxX),
    y: side === 'top' ? topY : bottomY,
    width: metrics.labelWidth
  }
}

export function getUiCheckEvidenceLabelAnchor(
  label: UiCheckEvidenceLabelPosition,
  target?: { x: number; y: number }
): { x: number; y: number } {
  const targetX = target?.x ?? label.x + label.width / 2
  const targetY = target?.y ?? label.y + 34
  if (label.side === 'left') {
    return { x: label.x + label.width, y: clamp(targetY, label.y + 16, label.y + 66) }
  }
  if (label.side === 'right') {
    return { x: label.x, y: clamp(targetY, label.y + 16, label.y + 66) }
  }
  if (label.side === 'top') {
    return { x: clamp(targetX, label.x + 18, label.x + label.width - 18), y: label.y + 82 }
  }
  return { x: clamp(targetX, label.x + 18, label.x + label.width - 18), y: label.y }
}

export function buildUiCheckEvidenceConnectorPath(
  source: { x: number; y: number },
  target: { x: number; y: number },
  side: UiCheckEvidenceLabelSide
): string {
  if (side === 'left' || side === 'right') {
    const direction = side === 'left' ? 1 : -1
    const offset = Math.max(80, Math.abs(target.x - source.x) * 0.38)
    return `M ${source.x} ${source.y} C ${source.x + direction * offset} ${source.y}, ${target.x - direction * offset} ${target.y}, ${target.x} ${target.y}`
  }
  const direction = side === 'top' ? 1 : -1
  const offset = Math.max(80, Math.abs(target.y - source.y) * 0.42)
  return `M ${source.x} ${source.y} C ${source.x} ${source.y + direction * offset}, ${target.x} ${target.y - direction * offset}, ${target.x} ${target.y}`
}

function pickSide(index: number, count: number): UiCheckEvidenceLabelSide {
  const order: UiCheckEvidenceLabelSide[] = count > 10 ? ['left', 'right', 'top', 'bottom'] : ['left', 'right']
  return order[index % order.length]
}

function indexesForSide(count: number, side: UiCheckEvidenceLabelSide): number[] {
  const result: number[] = []
  for (let index = 0; index < count; index++) {
    if (pickSide(index, count) === side) result.push(index)
  }
  return result
}

function spread(rank: number, count: number, min: number, max: number): number {
  if (count <= 1) return Math.round((min + max) / 2)
  return Math.round(min + ((max - min) * rank) / (count - 1))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
