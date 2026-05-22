import { describe, expect, it, vi } from 'vitest'
import { checkForMcpUpdate, compareVersions } from './update-check'

describe('compareVersions', () => {
  it('compares semantic versions', () => {
    expect(compareVersions('0.1.8', '0.1.7')).toBe(1)
    expect(compareVersions('0.1.7', '0.1.7')).toBe(0)
    expect(compareVersions('0.1.6', '0.1.7')).toBe(-1)
  })
})

describe('checkForMcpUpdate', () => {
  it('logs when a newer npm version is available', async () => {
    const log = vi.fn()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: '0.1.8' })
    })) as unknown as typeof fetch

    const result = await checkForMcpUpdate({
      currentVersion: '0.1.7',
      fetchImpl,
      log
    })

    expect(result).toEqual({
      currentVersion: '0.1.7',
      latestVersion: '0.1.8',
      updateAvailable: true
    })
    expect(log).toHaveBeenCalledWith('uicheck-mcp update available: 0.1.7 -> 0.1.8. Run: npx @uicheck/mcp@latest')
  })

  it('stays quiet when the current version is up to date', async () => {
    const log = vi.fn()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: '0.1.7' })
    })) as unknown as typeof fetch

    const result = await checkForMcpUpdate({
      currentVersion: '0.1.7',
      fetchImpl,
      log
    })

    expect(result?.updateAvailable).toBe(false)
    expect(log).not.toHaveBeenCalled()
  })
})
