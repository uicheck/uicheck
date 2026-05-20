export interface UiCheckBoxLike {
  x?: number
  y?: number
  left?: number
  top?: number
  width?: number
  height?: number
}

export interface UiCheckTreeElement {
  box?: UiCheckBoxLike
  children?: UiCheckTreeElement[]
  [key: string]: unknown
}

interface Box {
  x: number
  y: number
  width: number
  height: number
  area: number
}

export function createElementTree<T extends { box?: UiCheckBoxLike }>(elements: T[]): Array<T & { children: Array<T & { children: unknown[] }> }> {
  const boxes = elements.map((element) => normalizeBox(element.box))
  const parents = elements.map((_, index) => findParentIndex(index, boxes))
  const nodes = elements.map((element) => ({ ...element, children: [] as Array<T & { children: unknown[] }> }))
  const roots: Array<T & { children: Array<T & { children: unknown[] }> }> = []

  parents.forEach((parentIndex, index) => {
    if (parentIndex === undefined) {
      roots.push(nodes[index])
      return
    }
    nodes[parentIndex].children.push(nodes[index])
  })

  return roots
}

function normalizeBox(box: UiCheckBoxLike | undefined): Box | undefined {
  const width = numberValue(box?.width)
  const height = numberValue(box?.height)
  if (width === undefined || height === undefined || width <= 0 || height <= 0) return undefined
  const x = numberValue(box?.x) ?? numberValue(box?.left) ?? 0
  const y = numberValue(box?.y) ?? numberValue(box?.top) ?? 0
  return { x, y, width, height, area: width * height }
}

function findParentIndex(index: number, boxes: Array<Box | undefined>): number | undefined {
  const child = boxes[index]
  if (!child) return undefined
  let parentIndex: number | undefined
  let parentArea = Number.POSITIVE_INFINITY

  boxes.forEach((candidate, candidateIndex) => {
    if (candidateIndex === index || !candidate) return
    if (candidate.area <= child.area) return
    if (!contains(candidate, child)) return
    if (candidate.area < parentArea) {
      parentArea = candidate.area
      parentIndex = candidateIndex
    }
  })

  return parentIndex
}

function contains(parent: Box, child: Box): boolean {
  const parentRight = parent.x + parent.width
  const parentBottom = parent.y + parent.height
  const childRight = child.x + child.width
  const childBottom = child.y + child.height
  return child.x >= parent.x && child.y >= parent.y && childRight <= parentRight && childBottom <= parentBottom
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}
