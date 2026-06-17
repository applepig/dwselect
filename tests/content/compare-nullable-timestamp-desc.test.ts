import { describe, expect, it } from 'vitest'

import { compareNullableTimestampDesc } from '../../app/utils/content/compare-nullable-timestamp-desc'

describe('compareNullableTimestampDesc', () => {
  it('should return 0 when both values are equal', () => {
    expect(compareNullableTimestampDesc('2026-06-02', '2026-06-02')).toBe(0)
  })

  it('should return 0 when both values are null', () => {
    expect(compareNullableTimestampDesc(null, null)).toBe(0)
  })

  it('should sort a null left value last', () => {
    expect(compareNullableTimestampDesc(null, '2026-06-02')).toBe(1)
  })

  it('should sort a null right value last', () => {
    expect(compareNullableTimestampDesc('2026-06-02', null)).toBe(-1)
  })

  it('should sort the later timestamp first', () => {
    expect(compareNullableTimestampDesc('2026-06-01', '2026-06-02')).toBeGreaterThan(0)
    expect(compareNullableTimestampDesc('2026-06-02', '2026-06-01')).toBeLessThan(0)
  })
})
