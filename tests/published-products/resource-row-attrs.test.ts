import { describe, expect, it } from 'vitest'

import { EXTERNAL_LINK_ATTRS, RESOURCE_ROW_ICONS } from '../../app/utils/published-products/resource-row-attrs'

describe('resource row external link attributes and icon map', () => {
  it('should expose the safe external link attributes as a single source', () => {
    expect(EXTERNAL_LINK_ATTRS).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  it('should map guide and link resource types to their lucide icons', () => {
    expect(RESOURCE_ROW_ICONS).toEqual({
      guide: 'i-lucide-book-open',
      link: 'i-lucide-link',
    })
  })
})
