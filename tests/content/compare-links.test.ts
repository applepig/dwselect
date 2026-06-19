import { describe, expect, it } from 'vitest'

import type { LinkDefinition } from '../../app/utils/product-schema'
import { compareLinks } from '../../app/utils/content/compare-links'
import { test_links } from '../published-products/fixtures'

function makeLink(link: Partial<LinkDefinition> & Pick<LinkDefinition, 'id'>): LinkDefinition {
  return {
    ...test_links[0]!,
    ...link,
  }
}

function sortLinks(links: LinkDefinition[]): string[] {
  return links
    .toSorted(compareLinks)
    .map((link) => link.id)
}

describe('compareLinks (canonical)', () => {
  it('should order by sort_order ascending first', () => {
    const high_sort = makeLink({ id: 'high-sort', sort_order: 20 })
    const low_sort = makeLink({ id: 'low-sort', sort_order: 10 })

    expect(sortLinks([high_sort, low_sort])).toEqual(['low-sort', 'high-sort'])
  })

  it('should not let a fresher updated_at override the manual sort_order', () => {
    const low_sort_old = makeLink({ id: 'low-sort-old', sort_order: 10, updated_at: '2026-06-01T00:00:00+08:00' })
    const high_sort_new = makeLink({ id: 'high-sort-new', sort_order: 20, updated_at: '2026-06-05T00:00:00+08:00' })

    expect(sortLinks([high_sort_new, low_sort_old])).toEqual(['low-sort-old', 'high-sort-new'])
  })

  it('should order by updated_at descending within the same sort_order', () => {
    const older = makeLink({ id: 'older', sort_order: 10, updated_at: '2026-06-01T00:00:00+08:00' })
    const newer = makeLink({ id: 'newer', sort_order: 10, updated_at: '2026-06-05T00:00:00+08:00' })

    expect(sortLinks([older, newer])).toEqual(['newer', 'older'])
  })

  it('should tie-break by title using compareText when sort_order and updated_at match', () => {
    const banana = makeLink({ id: 'banana', sort_order: 10, updated_at: '2026-06-01T00:00:00+08:00', title: 'banana' })
    const apple = makeLink({ id: 'apple', sort_order: 10, updated_at: '2026-06-01T00:00:00+08:00', title: 'apple' })

    expect(sortLinks([banana, apple])).toEqual(['apple', 'banana'])
  })

  it('should fall back to id localeCompare when sort_order, updated_at and title are all equal', () => {
    const link_b = makeLink({ id: 'link-b', sort_order: 10, updated_at: '2026-06-01T00:00:00+08:00', title: '同名連結' })
    const link_a = makeLink({ id: 'link-a', sort_order: 10, updated_at: '2026-06-01T00:00:00+08:00', title: '同名連結' })

    expect(sortLinks([link_b, link_a])).toEqual(['link-a', 'link-b'])
  })
})
