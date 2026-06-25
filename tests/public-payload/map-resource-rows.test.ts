import { describe, expect, it } from 'vitest'

import { mapGuideRows, mapLinkRows } from '../../scripts/public-payload/map-resource-rows'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import type { Guide, LinkDefinition } from '../../app/utils/product-schema'
import { base_guide, test_links, test_taxonomies } from '../published-products/fixtures'

const labels = createTaxonomyLabelResolver(test_taxonomies)

describe('guide and link resource row build mapper', () => {
  it('should map only published guides to internal detail resource rows with taxonomy labels', () => {
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        title: '已發布指南',
        source_url: 'https://example.com/published-guide',
        image_url: null,
        category_ids: ['computer'],
        tag_ids: ['typing'],
      },
      {
        ...base_guide,
        id: 'draft-guide',
        status: 'draft',
        title: '草稿指南',
      },
    ]

    expect(mapGuideRows(guides, labels)).toEqual([
      {
        id: 'published-guide',
        type: 'guide',
        title: '已發布指南',
        subtitle: '指南摘要',
        meta: '電腦',
        href: '/guide/published-guide',
        image_url: null,
        icon: 'i-lucide-book-open',
        external: false,
        target: null,
        rel: null,
        category_ids: ['computer'],
        tag_ids: ['typing'],
      },
    ])
  })

  it('should resolve local guide image files for resource rows', () => {
    const guides: Guide[] = [
      { ...base_guide, id: 'local-guide', title: '本地圖片指南', image_file: 'local-guide.png', image_url: null },
    ]

    expect(mapGuideRows(guides, labels)).toEqual([
      expect.objectContaining({ id: 'local-guide', image_url: '/guides/images/local-guide.png' }),
    ])
  })

  it('should ignore external guide image urls for resource rows', () => {
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'external-image-guide',
        title: '外部圖片指南',
        image_file: null,
        image_url: 'https://scontent.ftpe8-2.fna.fbcdn.net/example.jpg',
      },
    ]

    expect(mapGuideRows(guides, labels)).toEqual([
      expect.objectContaining({ id: 'external-image-guide', image_url: null }),
    ])
  })

  it('should normalize quote-wrapped local guide image files for resource rows', () => {
    const guides: Guide[] = [
      { ...base_guide, id: 'quote-wrapped-guide', title: '引號圖片指南', image_file: '"quote-wrapped-guide.webp"', image_url: null },
    ]

    expect(mapGuideRows(guides, labels)).toEqual([
      expect.objectContaining({ id: 'quote-wrapped-guide', image_url: '/guides/images/quote-wrapped-guide.webp' }),
    ])
  })

  it('should order published guide rows by updated_at descending then title', () => {
    const older = { ...base_guide, id: 'older-guide', title: '舊指南', updated_at: '2026-06-01T00:00:00+08:00' }
    const banana = { ...base_guide, id: 'banana-guide', title: 'banana', updated_at: '2026-06-05T00:00:00+08:00' }
    const apple = { ...base_guide, id: 'apple-guide', title: 'apple', updated_at: '2026-06-05T00:00:00+08:00' }

    expect(mapGuideRows([older, banana, apple], labels).map((row) => row.id)).toEqual([
      'apple-guide',
      'banana-guide',
      'older-guide',
    ])
  })

  it('should map only published links to external resource rows with image fallback and safe attributes', () => {
    const links: LinkDefinition[] = [
      ...test_links,
      { ...test_links[0]!, id: 'archived-link', status: 'archived', title: '封存連結' },
    ]

    expect(mapLinkRows(links)).toEqual([
      {
        id: 'applepig-home',
        type: 'link',
        title: 'applepig.idv.tw',
        subtitle: 'DW 的主站',
        meta: 'https://applepig.idv.tw',
        href: 'https://applepig.idv.tw',
        image_url: null,
        icon: 'i-lucide-link',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
        category_ids: ['other'],
        tag_ids: [],
      },
    ])
  })

  it('should preserve optional link images in resource rows', () => {
    const links: LinkDefinition[] = [
      { ...test_links[0]!, image_url: 'https://example.com/applepig-logo.png' },
    ]

    expect(mapLinkRows(links)).toEqual([
      expect.objectContaining({
        id: 'applepig-home',
        image_url: 'https://example.com/applepig-logo.png',
        icon: 'i-lucide-link',
      }),
    ])
  })

  it('should order published link rows by sort_order ascending then updated_at descending, title and id', () => {
    const low_sort_old_update = {
      ...test_links[0]!,
      id: 'low-sort-old-update',
      title: '低排序較舊',
      sort_order: 1,
      updated_at: '2026-06-01T00:00:00+08:00',
    }
    const high_sort_new_update = {
      ...test_links[0]!,
      id: 'high-sort-new-update',
      title: '高排序較新',
      sort_order: 2,
      updated_at: '2026-06-05T00:00:00+08:00',
    }
    const low_sort_banana = {
      ...test_links[0]!,
      id: 'low-sort-banana',
      title: 'banana',
      sort_order: 1,
      updated_at: '2026-06-05T00:00:00+08:00',
    }
    const low_sort_apple = {
      ...test_links[0]!,
      id: 'low-sort-apple',
      title: 'apple',
      sort_order: 1,
      updated_at: '2026-06-05T00:00:00+08:00',
    }

    // low_sort_old_update keeps sort_order 1 despite the oldest updated_at, proving
    // manual sort_order is not overridden by a fresher edit timestamp.
    expect(mapLinkRows([high_sort_new_update, low_sort_old_update, low_sort_banana, low_sort_apple]).map((row) => row.id)).toEqual([
      'low-sort-apple',
      'low-sort-banana',
      'low-sort-old-update',
      'high-sort-new-update',
    ])
  })
})
