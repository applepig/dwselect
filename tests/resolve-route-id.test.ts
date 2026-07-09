import { describe, expect, it } from 'vitest'

import { resolveRouteId } from '../app/utils/resolve-route-id'

describe('resolveRouteId', () => {
  it('原樣回傳 string 型別的 route id', () => {
    expect(resolveRouteId('sample-product')).toBe('sample-product')
  })

  it('取陣列首段，當 route id 為 string[]', () => {
    expect(resolveRouteId(['home', 'ignored'])).toBe('home')
  })

  it('回傳空字串 fallback，當 route id 為 undefined 且未指定 fallback', () => {
    expect(resolveRouteId(undefined)).toBe('')
  })

  it('回傳指定的 fallback，當 route id 為 undefined', () => {
    expect(resolveRouteId(undefined, 'all')).toBe('all')
  })

  it('回傳指定的 fallback，當 route id 為空陣列', () => {
    expect(resolveRouteId([], 'all')).toBe('all')
  })
})
