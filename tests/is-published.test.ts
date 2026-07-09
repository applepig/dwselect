import { describe, expect, it } from 'vitest'

import { isPublished } from '../app/utils/content/is-published'

describe('isPublished', () => {
  it('回傳 true，當 status 為 published', () => {
    expect(isPublished({ status: 'published' })).toBe(true)
  })

  it('回傳 false，當 status 為 draft', () => {
    expect(isPublished({ status: 'draft' })).toBe(false)
  })

  it('回傳 false，當 status 為 unpublished', () => {
    expect(isPublished({ status: 'unpublished' })).toBe(false)
  })

  it('回傳 false，當 status 為 archived', () => {
    expect(isPublished({ status: 'archived' })).toBe(false)
  })
})
