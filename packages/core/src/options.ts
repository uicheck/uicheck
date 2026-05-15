import type { ResolvedUiCheckOptions } from './types'

export const DEFAULT_OPTIONS: ResolvedUiCheckOptions = {
  position: 'bottom-left',
  offset: [20, 20],
  size: 36,
  color: '#ef4444',
  draggable: true
}

export function parseUiCheckOptionsFromUrl(scriptUrl: string, baseUrl = globalThis.location?.href): ResolvedUiCheckOptions {
  const params = new URL(scriptUrl, baseUrl).searchParams

  return {
    position: (params.get('position') as ResolvedUiCheckOptions['position'] | null) ?? DEFAULT_OPTIONS.position,
    offset: parseOffset(params.get('offset'), DEFAULT_OPTIONS.offset),
    size: parseNumber(params.get('size'), DEFAULT_OPTIONS.size),
    color: params.get('color') ?? DEFAULT_OPTIONS.color,
    draggable: parseBoolean(params.get('draggable'), DEFAULT_OPTIONS.draggable),
    socket: parseSocketOptions(params)
  }
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback
  return value !== 'false'
}

function parseNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseOffset(value: string | null, fallback: [number, number]): [number, number] {
  if (!value) return fallback
  const [first, second] = value.split(',').map((part) => Number(part.trim()))
  if (!Number.isFinite(first) || !Number.isFinite(second)) return fallback
  return [first, second]
}

function parseSocketOptions(params: URLSearchParams): ResolvedUiCheckOptions['socket'] {
  const url = params.get('socketUrl') ?? params.get('mcpSocket')
  if (!url) return undefined
  return {
    url,
    clientId: params.get('clientId') ?? '',
    reconnectMs: parseNumber(params.get('reconnectMs'), 1000),
    enabled: parseBoolean(params.get('socket'), true)
  }
}
