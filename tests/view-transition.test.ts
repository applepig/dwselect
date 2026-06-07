import { describe, expect, it, vi } from 'vitest'

import { runViewTransition } from '../app/utils/view-transition'

describe('view transition helper', () => {
  it('should run synchronously when document is unavailable', () => {
    const action = vi.fn()

    runViewTransition(action, { document: null })

    expect(action).toHaveBeenCalledOnce()
  })

  it('should skip startViewTransition when the browser does not support it', () => {
    const action = vi.fn()
    const document_stub = {}

    runViewTransition(action, { document: document_stub })

    expect(action).toHaveBeenCalledOnce()
  })

  it('should skip startViewTransition when reduced motion is requested', () => {
    const action = vi.fn()
    const startViewTransition = vi.fn()
    const document_stub = { startViewTransition }
    const matchMedia = vi.fn(() => ({ matches: true }))

    runViewTransition(action, { document: document_stub, matchMedia })

    expect(action).toHaveBeenCalledOnce()
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('should use startViewTransition when supported and motion is allowed', () => {
    const action = vi.fn()
    const startViewTransition = vi.fn((callback: () => void) => callback())
    const document_stub = { startViewTransition }
    const matchMedia = vi.fn(() => ({ matches: false }))

    runViewTransition(action, { document: document_stub, matchMedia })

    expect(startViewTransition).toHaveBeenCalledOnce()
    expect(action).toHaveBeenCalledOnce()
  })
})
