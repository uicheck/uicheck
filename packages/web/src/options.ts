import type { ResolvedUiCheckOptions } from './types'

export const DEFAULT_OPTIONS: ResolvedUiCheckOptions = {
}

export function parseUiCheckOptionsFromUrl(scriptUrl: string, baseUrl = globalThis.location?.href): ResolvedUiCheckOptions {
  const params = new URL(scriptUrl, baseUrl).searchParams

  return {
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
