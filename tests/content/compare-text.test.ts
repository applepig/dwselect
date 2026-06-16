import { describe, expect, it } from 'vitest'

import { compareText } from '../../app/utils/content/compare-text'

describe('compareText', () => {
  it('should return 0 for identical strings', () => {
    expect(compareText('蘋果', '蘋果')).toBe(0)
  })

  it('should order by code point of the first differing character', () => {
    expect(compareText('apple', 'banana')).toBeLessThan(0)
    expect(compareText('banana', 'apple')).toBeGreaterThan(0)
  })

  it('should order the shorter string first when it is a prefix of the longer', () => {
    expect(compareText('app', 'apple')).toBeLessThan(0)
    expect(compareText('apple', 'app')).toBeGreaterThan(0)
  })

  it('should NFKC normalize before comparing so full-width and half-width match', () => {
    expect(compareText('ＡＢＣ', 'ABC')).toBe(0)
  })

  it('should compare by code point across multi-byte characters', () => {
    expect(compareText('a', '蘋')).toBeLessThan(0)
  })
})
