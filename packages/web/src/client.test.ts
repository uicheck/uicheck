import { afterEach, describe, expect, it, vi } from 'vitest'
import { initUiCheck } from './web'
import type { ResolvedUiCheckOptions } from './types'

const config: ResolvedUiCheckOptions = {}

describe('initUiCheck', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('does not inject visual controls', () => {
    initUiCheck(config)

    expect(document.getElementById('uicheck-floatball')).toBeNull()
    expect(document.getElementById('uicheck-modal-root')).toBeNull()
    expect(document.head.textContent).toBe('')
  })

  it('can be installed more than once without creating UI nodes', () => {
    initUiCheck(config)
    initUiCheck(config)

    expect(document.querySelectorAll('#uicheck-floatball')).toHaveLength(0)
    expect(document.querySelectorAll('#uicheck-modal-root')).toHaveLength(0)
  })
})
