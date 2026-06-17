import { describe, expect, it } from 'vitest'

import { mapGuideRows, mapLinkRows } from '../../scripts/public-payload/map-resource-rows'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import type { Guide, LinkDefinition } from '../../app/utils/product-schema'
import { base_guide, test_links, test_taxonomies } from '../published-products/fixtures'

const labels = createTaxonomyLabelResolver(test_taxonomies)

describe('guide and link resource row build mapper', () => {
  it('should map only published guides to external resource rows with taxonomy labels', () => {
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
        href: 'https://example.com/published-guide',
        image_url: null,
        icon: 'i-lucide-book-open',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ])
  })

  it('should resolve local guide image files for resource rows', () => {
    const guides: Guide[] = [
      { ...base_guide, id: 'local-guide', title: '本地圖片指南', image_file: 'local-guide.png', image_url: null },
    ]

    expect(mapGuideRows(guides, labels)).toEqual([
      expect.objectContaining({ id: 'local-guide', image_url: '/images/guides/local-guide.webp' }),
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
      expect.objectContaining({ id: 'quote-wrapped-guide', image_url: '/images/guides/quote-wrapped-guide.webp' }),
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
})
