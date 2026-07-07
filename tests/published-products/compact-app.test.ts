import { describe, expect, it } from 'vitest'

import { NAV_TABS, getCompactAppStateFromRoute, getCompactAppView } from '../../app/utils/published-products/compact-app'
import { buildPublicContentPayload } from '../../scripts/public-content'
import type { TaxonomyDefinitions } from '../../app/utils/published-products/types'
import type { Guide, LinkDefinition } from '../../app/utils/product-schema'
import { base_guide, makeProduct, test_guides, test_links, test_taxonomies } from './fixtures'

describe('compact app view state', () => {
  function buildPayload(
    products: ReturnType<typeof makeProduct>[],
    links = test_links,
    guides = test_guides,
    taxonomies = test_taxonomies,
  ) {
    return buildPublicContentPayload({ products, guides, links, taxonomies })
  }

  function getCompactView(
    products: ReturnType<typeof makeProduct>[],
    links = test_links,
    guides = test_guides,
    taxonomies = test_taxonomies,
  ) {
    return getCompactAppView(buildPayload(products, links, guides, taxonomies))
  }

  it('should expose category chips and all home products', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'home' }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 2, active: true },
      { id: 'home', label: '居家', count: 1, active: false },
      { id: 'computer', label: '電腦', count: 1, active: false },
    ])
    expect(compact_view.home.products.map((product) => product.id)).toEqual(['home-product', 'computer-product'])
  })

  it('should keep the all chip active without mutating navigation counts', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'draft-kitchen-product', status: 'draft', name: '廚房草稿', category_id: 'kitchen' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 2, active: true },
      { id: 'home', label: '居家', count: 1, active: false },
      { id: 'computer', label: '電腦', count: 1, active: false },
    ])
    expect(compact_view.home.category_chips.map((chip) => chip.id)).not.toContain('kitchen')
  })

  it('should expose published guide resources from the guides content domain', () => {
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        title: '已發布指南',
        summary: '指南摘要',
        source_url: 'https://example.com/published-guide',
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

    const compact_view = getCompactView([], test_links, guides)

    expect(compact_view.guide.guides).toEqual([
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
    expect(compact_view.guide.empty_reason).toBeNull()
  })

  it('should expose the empty home reason only when no published products exist', () => {
    expect(getCompactView([]).home.empty_reason).toBe('no-products')

    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
    ]

    expect(getCompactView(products).home.empty_reason).toBeNull()
  })

  it('should expose the fallback other category label in compact category chips', () => {
    const products = [
      makeProduct({ id: 'other-product', status: 'published', name: '未知分類商品', category_id: 'other' }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 1, active: true },
      { id: 'other', label: '其他', count: 1, active: false },
    ])
    expect(compact_view.home.products.map((product) => product.id)).toEqual(['other-product'])
  })

  it('should accept newly added taxonomy categories and brands without production code changes', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      categories: [
        ...test_taxonomies.categories,
        { id: 'audio-gear', label: '音響器材', short_label: '音響', nav_visible: true, sort_order: 35 },
        { id: 'empty-new-category', label: '空新分類', short_label: '空分類', nav_visible: true, sort_order: 36 },
      ],
      brands: [
        { id: 'fixture-brand', label: 'Fixture Brand', description: '測試品牌', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }
    const products = [
      makeProduct({
        id: 'audio-product',
        status: 'published',
        name: '新分類商品',
        category_id: 'audio-gear',
        tag_ids: ['fixture-brand'],
      }),
    ]
    const compact_view = getCompactView(products, test_links, test_guides, taxonomies)

    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 1, active: true },
      { id: 'audio-gear', label: '音響', count: 1, active: false },
    ])
    expect(compact_view.home.category_chips.map((chip) => chip.id)).not.toContain('empty-new-category')
    expect(compact_view.home.products).toEqual([
      expect.objectContaining({
        id: 'audio-product',
        category_label: '音響器材',
        tag_labels: ['Fixture Brand'],
      }),
    ])
  })

  it('should expose only published link resources with safe external link attributes', () => {
    const links: LinkDefinition[] = [
      ...test_links,
      {
        ...test_links[0]!,
        id: 'draft-link',
        status: 'draft',
        title: '草稿連結',
        sort_order: 1,
      },
    ]

    const compact_view = getCompactView([], links)

    expect(compact_view.links).toEqual([
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
})

describe('navigation tab single source of truth', () => {
  it('should order nav tabs home, guide, links, search with matching routes', () => {
    expect(NAV_TABS.map((tab) => tab.id)).toEqual(['home', 'guide', 'links', 'search'])
    expect(NAV_TABS.map((tab) => tab.to)).toEqual(['/', '/guide', '/links', '/search'])
  })

  it('should place the links tab before the search tab', () => {
    const link_index = NAV_TABS.findIndex((tab) => tab.id === 'links')
    const search_index = NAV_TABS.findIndex((tab) => tab.id === 'search')

    expect(link_index).toBeLessThan(search_index)
  })
})

describe('route-driven compact app state', () => {
  it('should return empty state for non-search routes', () => {
    expect(getCompactAppStateFromRoute({ path: '/', query: {} })).toEqual({})
    expect(getCompactAppStateFromRoute({ path: '/guide', query: {} })).toEqual({})
    expect(getCompactAppStateFromRoute({ path: '/links', query: {} })).toEqual({})
  })

  it('should derive the trimmed search query from the search route query', () => {
    expect(getCompactAppStateFromRoute({ path: '/search', query: {} })).toEqual({ search_query: '' })
    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: '  機械鍵盤  ' } })).toEqual({ search_query: '機械鍵盤' })
    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: ['  ', 'ignored'] } })).toEqual({ search_query: '' })
  })

  it('should ignore category and tag query values on non-search routes', () => {
    expect(getCompactAppStateFromRoute({ path: '/', query: { category: 'audio-gear' } })).toEqual({})
    expect(getCompactAppStateFromRoute({ path: '/', query: { category: 'missing' } })).toEqual({})
    expect(getCompactAppStateFromRoute({ path: '/guide', query: { tags: ['不存在', '影音'] } })).toEqual({})
    expect(getCompactAppStateFromRoute({ path: '/guide', query: { tags: '工作' } })).toEqual({})
    expect(getCompactAppStateFromRoute({ path: '/guide', query: { tags: ['工作', '輸入'] } })).toEqual({})
  })

  it('should not create a guide tag URL contract for labels containing commas', () => {
    const selected_tags = ['a,b', 'c']
    const round_tripped_query = { tags: selected_tags }

    expect(getCompactAppStateFromRoute({ path: '/guide', query: round_tripped_query })).toEqual({})
  })
})
