import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUiCheck } from './web'
import type { ResolvedUiCheckOptions } from './types'

const config: ResolvedUiCheckOptions = {
  position: 'top-left',
  offset: [12, 16],
  size: 48,
  color: '#123456',
  draggable: false
}

describe('installUiCheck', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('injects a floatball and modal root with configured styles', () => {
    installUiCheck(vi.fn(), config)

    const ball = document.getElementById('uicheck-floatball')
    const modal = document.getElementById('uicheck-modal-root')

    expect(ball).not.toBeNull()
    expect(ball?.textContent).toBe('UI')
    expect(ball?.style.top).toBe('12px')
    expect(ball?.style.left).toBe('16px')
    expect(document.head.textContent).toContain('background:#123456')
    expect(document.head.textContent).toContain('width:48px;height:48px')
    expect(modal?.querySelector('.uicheck-close')).toBeInstanceOf(HTMLButtonElement)
  })

  it('does not inject duplicate controls when installed twice', () => {
    installUiCheck(vi.fn(), config)
    installUiCheck(vi.fn(), { ...config, color: '#ffffff' })

    expect(document.querySelectorAll('#uicheck-floatball')).toHaveLength(1)
    expect(document.querySelectorAll('#uicheck-modal-root')).toHaveLength(1)
  })
})
