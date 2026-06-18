import { describe, expect, it } from 'vitest'

import type { Guide } from '../../app/utils/product-schema'
import { compareGuides } from '../../app/utils/content/compare-guides'
import { base_guide } from '../published-products/fixtures'

function makeGuide(guide: Partial<Guide> & Pick<Guide, 'id'>): Guide {
  return {
    ...base_guide,
    ...guide,
  }
}

function sortGuides(guides: Guide[]): string[] {
  return guides
    .toSorted(compareGuides)
    .map((guide) => guide.id)
}

describe('compareGuides (canonical)', () => {
  it('should order by updated_at descending', () => {
    const older = makeGuide({ id: 'older', updated_at: '2026-06-01T00:00:00+08:00' })
    const newer = makeGuide({ id: 'newer', updated_at: '2026-06-05T00:00:00+08:00' })

    expect(sortGuides([older, newer])).toEqual(['newer', 'older'])
  })

  it('should prefer updated_at over published_at', () => {
    const recently_published = makeGuide({
      id: 'recently-published',
      updated_at: '2026-06-01T00:00:00+08:00',
      published_at: '2026-06-05T00:00:00+08:00',
    })
    const recently_updated = makeGuide({
      id: 'recently-updated',
      updated_at: '2026-06-05T00:00:00+08:00',
      published_at: '2026-06-01T00:00:00+08:00',
    })

    expect(sortGuides([recently_published, recently_updated])).toEqual(['recently-updated', 'recently-published'])
  })

  it('should tie-break by title using compareText when updated_at matches', () => {
    const banana = makeGuide({ id: 'banana', title: 'banana', updated_at: '2026-06-01T00:00:00+08:00' })
    const apple = makeGuide({ id: 'apple', title: 'apple', updated_at: '2026-06-01T00:00:00+08:00' })

    expect(sortGuides([banana, apple])).toEqual(['apple', 'banana'])
  })

  it('should NFKC normalize titles in the tie-break', () => {
    const full_width = makeGuide({ id: 'full', title: 'ＡＢＣ', updated_at: '2026-06-01T00:00:00+08:00' })
    const half_width = makeGuide({ id: 'half', title: 'ABC', updated_at: '2026-06-01T00:00:00+08:00' })

    expect(compareGuides(full_width, half_width)).toBe(0)
  })
})
