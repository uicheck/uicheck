import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createTaroUiCheckAdapter, type TaroLike, type TaroSelectorQueryNode } from './taro'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const bundlePath = resolve(root, 'examples/taro-demo/dist/pages/index/index.js')
const wxmlPath = resolve(root, 'examples/taro-demo/dist/pages/index/index.wxml')

describe('Taro WeApp real build snapshot', () => {
  it('matches the UICheck inspect_elements snapshot from the compiled weapp demo', async () => {
    const bundle = await readFile(bundlePath, 'utf8')
    const wxml = await readFile(wxmlPath, 'utf8')
    const taro = createTaroFromCompiledWeapp(extractUiCheckNodes(bundle))
    const adapter = createTaroUiCheckAdapter({ taro })

    expect(bundle).toContain('inspect_elements')
    expect(wxml).toContain('<template is="taro_tmpl"')
    const inspected = await adapter.inspectElements({ limit: 140 })
    await writeArtifact('taro-weapp-inspect-elements.snapshot.json', inspected)
    expect(inspected).toMatchSnapshot()
  })
})

async function writeArtifact(fileName: string, value: unknown) {
  const output = resolve(root, 'packages/taro/build/uicheck-test-artifacts', fileName)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(value, null, 2)}\n`)
}

function createTaroFromCompiledWeapp(nodes: TaroSelectorQueryNode[]): TaroLike {
  return {
    connectSocket: vi.fn(() => ({
      send: vi.fn(),
      close: vi.fn(),
      onOpen: vi.fn(),
      onMessage: vi.fn(),
      onClose: vi.fn()
    })),
    createSelectorQuery: () => {
      const query = {
        selectAll: vi.fn(() => ({
          fields: vi.fn((_fields, callback) => {
            callback(nodes)
            return query
          }),
          boundingClientRect: vi.fn((callback) => {
            callback(nodes)
            return query
          })
        })),
        selectViewport: vi.fn(() => ({
          scrollOffset: vi.fn((callback) => {
            callback({ scrollLeft: 0, scrollTop: 0 })
            return query
          })
        })),
        exec: vi.fn((callback?: () => void) => callback?.())
      }
      return query
    },
    getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 753, pixelRatio: 2 })
  }
}

function extractUiCheckNodes(bundle: string): TaroSelectorQueryNode[] {
  const nodes: TaroSelectorQueryNode[] = []
  let offset = 0
  while (true) {
    const markerIndex = bundle.indexOf('uicheck-node', offset)
    if (markerIndex === -1) break
    offset = markerIndex + 'uicheck-node'.length

    const objectStart = bundle.lastIndexOf('{', markerIndex)
    if (objectStart === -1) continue
    const objectEnd = findMatchingBrace(bundle, objectStart)
    if (objectEnd === -1) continue

    const propsSource = bundle.slice(objectStart + 1, objectEnd).split(/,children:/, 1)[0]
    const className = readStringProperty(propsSource, 'className')
    if (!className?.split(/\s+/).includes('uicheck-node')) continue

    const id = readStringProperty(propsSource, 'id')
    const testid = readStringProperty(propsSource, '"data-testid"')
    const box = getDemoBox(id, testid)
    nodes.push({
      id,
      className,
      dataset: compactObject({
        uicheckTag: readStringProperty(propsSource, '"data-uicheck-tag"') ?? 'node',
        text: readStringProperty(propsSource, '"data-text"'),
        testid
      }),
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height
    })
  }
  if (bundle.includes('detailRows') || bundle.includes('detail-row-')) {
    nodes.push(...createDetailNodes())
  }
  return nodes
}

function getDemoBox(id?: string, testid?: string) {
  if (id === 'screen') return { left: 0, top: 0, width: 390, height: 753 }
  if (id === 'eyebrow') return { left: 14, top: 12, width: 100, height: 18 }
  if (id === 'title') return { left: 14, top: 34, width: 248, height: 34 }
  if (id === 'summary-card') return { left: 14, top: 82, width: 362, height: 66 }
  if (id === 'summary-title') return { left: 24, top: 92, width: 180, height: 18 }
  if (id === 'summary-text') return { left: 24, top: 114, width: 320, height: 24 }
  if (id === 'items-card') return { left: 14, top: 156, width: 362, height: 92 }
  if (id === 'items-title') return { left: 24, top: 166, width: 120, height: 18 }
  if (id === 'item-row-1') return { left: 24, top: 188, width: 320, height: 15 }
  if (id === 'item-row-2') return { left: 24, top: 206, width: 320, height: 15 }
  if (id === 'total-row') return { left: 24, top: 226, width: 320, height: 16 }
  if (id === 'status-card') return { left: 14, top: 256, width: 362, height: 66 }
  if (id === 'status-title') return { left: 24, top: 266, width: 190, height: 18 }
  if (id === 'status-text') return { left: 24, top: 288, width: 260, height: 24 }
  if (id === 'details-panel') return { left: 14, top: 330, width: 362, height: 370 }
  if (id === 'details-title') return { left: 22, top: 338, width: 150, height: 18 }
  if (id === 'details-grid') return { left: 22, top: 360, width: 346, height: 330 }
  if (id === 'hint-banner') return { left: 14, top: 708, width: 362, height: 34 }
  if (id === 'submit-button' || testid === 'submit-button') return { left: 14, top: 699, width: 362, height: 40 }
  return { left: 24, top: 24, width: 156, height: 44 }
}

function createDetailNodes(): TaroSelectorQueryNode[] {
  const nodes: TaroSelectorQueryNode[] = [
    createNode('details-panel', 'details-panel uicheck-node', 'view', 'Runtime detail matrix', getDemoBox('details-panel')),
    createNode('details-title', 'details-title uicheck-node', 'text', 'Runtime detail matrix', getDemoBox('details-title')),
    createNode('details-grid', 'details-grid uicheck-node', 'view', 'Runtime details', getDemoBox('details-grid'))
  ]
  for (let index = 0; index < 34; index += 1) {
    const number = index + 1
    const padded = String(number).padStart(2, '0')
    const value = number % 3 === 0 ? 'ok' : number % 3 === 1 ? 'warn' : 'trace'
    const column = index % 2
    const line = Math.floor(index / 2)
    const x = 22 + column * 174
    const y = 360 + line * 19
    nodes.push(
      createNode(`detail-row-${padded}`, 'detail-row uicheck-node', 'view', `Runtime check ${padded} ${value}`, { left: x, top: y, width: 166, height: 16 }),
      createNode(`detail-label-${padded}`, 'detail-label uicheck-node', 'text', `Runtime check ${padded}`, { left: x + 4, top: y + 2, width: 108, height: 12 }),
      createNode(`detail-value-${padded}`, 'detail-value uicheck-node', 'text', value, { left: x + 126, top: y + 2, width: 34, height: 12 })
    )
  }
  return nodes
}

function createNode(id: string, className: string, tag: string, text: string, box: { left: number; top: number; width: number; height: number }): TaroSelectorQueryNode {
  return {
    id,
    className,
    dataset: {
      uicheckTag: tag,
      text
    },
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height
  }
}

function findMatchingBrace(source: string, start: number): number {
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function readStringProperty(source: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.match(new RegExp(`${escapedKey}:"([^"]*)"`))?.[1]
}

function compactObject<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T
}
