import { describe, expect, it } from 'vitest'

import {
  createSearchInputCompositionState,
  endSearchInputComposition,
  getSearchInputQueryUpdate,
  startSearchInputComposition,
} from '../app/utils/search/search-input-composition'

describe('search input composition guard', () => {
  it('should defer query updates during IME composition and sync when composition ends', () => {
    const composition_state = createSearchInputCompositionState()

    startSearchInputComposition(composition_state)
    const composing_update = getSearchInputQueryUpdate(composition_state, '鍵', '')
    const ended_update = endSearchInputComposition(composition_state, '鍵盤', '')

    expect(composing_update).toBeNull()
    expect(ended_update).toBe('鍵盤')
  })

  it('should not emit a query update when input value equals the current query', () => {
    const composition_state = createSearchInputCompositionState()

    const update = getSearchInputQueryUpdate(composition_state, 'Sharp', 'Sharp')

    expect(update).toBeNull()
  })
})
