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

export interface UiCheckElementSearch {
  query?: string
  selector?: string
  id?: string
  testId?: string
  text?: string
  accessibilityLabel?: string
  className?: string
  role?: string
  tag?: string
}

interface Box {
  x: number
  y: number
  width: number
  height: number
  area: number
}

export type UiCheckTreeNode<T> = T & { children: Array<UiCheckTreeNode<T>> }

export function createElementTree<T extends { box?: UiCheckBoxLike }>(elements: T[]): Array<UiCheckTreeNode<T>> {
  const boxes = elements.map((element) => normalizeBox(element.box))
  const parents = elements.map((_, index) => findParentIndex(index, boxes))
  const nodes = elements.map((element) => ({ ...element, children: [] as Array<UiCheckTreeNode<T>> })) as Array<UiCheckTreeNode<T>>
  const roots: Array<UiCheckTreeNode<T>> = []

  parents.forEach((parentIndex, index) => {
    if (parentIndex === undefined) {
      roots.push(nodes[index])
      return
    }
    nodes[parentIndex].children.push(nodes[index])
  })

  return roots
}

export function createFilteredElementTree<T extends { box?: UiCheckBoxLike }>(
  elements: T[],
  search?: UiCheckElementSearch
): Array<UiCheckTreeNode<T>> {
  const tree = createElementTree(elements)
  if (!hasSearch(search)) return tree
  return filterElementTree(tree, search)
}

export function normalizeElementSearch(params: Record<string, unknown> = {}): UiCheckElementSearch | undefined {
  const search: UiCheckElementSearch = {}
  for (const key of ['query', 'selector', 'id', 'testId', 'text', 'accessibilityLabel', 'className', 'role', 'tag'] as const) {
    const value = params[key]
    if (typeof value === 'string' && value.trim()) search[key] = value.trim()
  }
  return hasSearch(search) ? search : undefined
}

export function flattenElementTree<T extends { children?: unknown[] }>(tree: T[]): T[] {
  const result: T[] = []
  const visit = (node: T) => {
    result.push(node)
    for (const child of node.children ?? []) visit(child as T)
  }
  for (const node of tree) visit(node)
  return result
}

export function countElementTree(tree: Array<{ children?: unknown[] }>): number {
  let count = 0
  const visit = (node: { children?: unknown[] }) => {
    count += 1
    for (const child of node.children ?? []) visit(child as { children?: unknown[] })
  }
  for (const node of tree) visit(node)
  return count
}

export function elementMatchesSearch(element: Record<string, unknown>, search: UiCheckElementSearch | undefined): boolean {
  if (!hasSearch(search)) return true
  if (search.query && !matchesAnyText(element, search.query)) return false
  if (search.selector && !matchesSelectorText(element, search.selector)) return false
  if (search.id && !matchesField(element.id, search.id)) return false
  if (search.testId && !matchesField(element.testId ?? element.testID, search.testId)) return false
  if (search.text && !matchesField(element.text, search.text)) return false
  if (search.accessibilityLabel && !matchesField(element.accessibilityLabel ?? element.ariaLabel ?? element.semanticsLabel, search.accessibilityLabel)) return false
  if (search.className && !matchesClasses(element.classes, search.className)) return false
  if (search.role && !matchesField(element.role, search.role)) return false
  if (search.tag && !matchesField(element.tag, search.tag)) return false
  return true
}

function normalizeBox(box: UiCheckBoxLike | undefined): Box | undefined {
  const width = numberValue(box?.width)
  const height = numberValue(box?.height)
  if (width === undefined || height === undefined || width <= 0 || height <= 0) return undefined
  const x = numberValue(box?.x) ?? numberValue(box?.left) ?? 0
  const y = numberValue(box?.y) ?? numberValue(box?.top) ?? 0
  return { x, y, width, height, area: width * height }
}

function filterElementTree<T extends { children: unknown[] }>(tree: T[], search: UiCheckElementSearch): T[] {
  const result: T[] = []
  for (const node of tree) {
    const children = filterElementTree((node.children ?? []) as T[], search)
    if (elementMatchesSearch(node as Record<string, unknown>, search) || children.length > 0) {
      result.push({ ...node, children } as T)
    }
  }
  return result
}

function hasSearch(search: UiCheckElementSearch | undefined): search is UiCheckElementSearch {
  return Boolean(
    search &&
      (search.query ||
        search.selector ||
        search.id ||
        search.testId ||
        search.text ||
        search.accessibilityLabel ||
        search.className ||
        search.role ||
        search.tag)
  )
}

function matchesSelectorText(element: Record<string, unknown>, selector: string): boolean {
  const value = selector.trim()
  if (!value) return true
  if (value.startsWith('#')) return matchesField(element.id, value.slice(1))
  if (value.startsWith('.')) return matchesClasses(element.classes, value.slice(1))
  if (value.startsWith('[data-testid=') || value.startsWith('[data-test-id=')) {
    const testId = value.replace(/^\[data-test-?id=['"]?/, '').replace(/['"]?\]$/, '')
    return matchesField(element.testId ?? element.testID, testId)
  }
  return matchesField(element.tag, value) || matchesField(element.id, value) || matchesClasses(element.classes, value)
}

function matchesAnyText(element: Record<string, unknown>, query: string): boolean {
  return [
    element.id,
    element.testId,
    element.testID,
    element.text,
    element.accessibilityLabel,
    element.ariaLabel,
    element.semanticsLabel,
    element.role,
    element.tag,
    element.href,
    ...(Array.isArray(element.classes) ? element.classes : [])
  ].some((value) => matchesField(value, query))
}

function matchesField(value: unknown, query: string): boolean {
  if (value === undefined || value === null) return false
  return String(value).toLowerCase().includes(query.toLowerCase())
}

function matchesClasses(value: unknown, query: string): boolean {
  if (Array.isArray(value)) return value.some((item) => matchesField(item, query))
  return matchesField(value, query)
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
