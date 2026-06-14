import { describe, expect, it } from 'vitest'

import { formatPublishedDate } from '../app/utils/format-published-date'

describe('published date formatting', () => {
  it('should format dates in Asia/Taipei timezone to avoid SSR timezone mismatch', () => {
    expect(formatPublishedDate('2026-06-01T16:30:00+00:00')).toBe('2026/06/02')
  })

  it('should return a fallback label when published date is missing', () => {
    expect(formatPublishedDate(null)).toBe('未標日期')
  })
})
