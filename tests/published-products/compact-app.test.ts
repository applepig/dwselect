import { describe, expect, it } from 'vitest'

import { getCompactAppStateFromRoute, getCompactAppView } from '../../app/utils/published-products/compact-app'
import { buildPublicContentPayload } from '../../scripts/public-content'
import type { CompactAppState, TaxonomyDefinitions } from '../../app/utils/published-products/types'
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
    state: CompactAppState = {},
    links = test_links,
    guides = test_guides,
    taxonomies = test_taxonomies,
  ) {
    return getCompactAppView(buildPayload(products, links, guides, taxonomies), state)
  }

  it('should expose four compact tabs and category chips for home filtering', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'home' }),
    ]

    const compact_view = getCompactView(products, { active_tab: 'home', home_category_id: 'computer' })

    expect(compact_view.tabs).toEqual([
      { id: 'home', label: '首頁', icon: 'i-lucide-house', active: true },
      { id: 'guide', label: '指南', icon: 'i-lucide-tags', active: false },
      { id: 'search', label: '搜尋', icon: 'i-lucide-search', active: false },
      { id: 'links', label: '連結', icon: 'i-lucide-link', active: false },
    ])
    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 2, active: false },
      { id: 'home', label: '居家', count: 1, active: false },
      { id: 'computer', label: '電腦', count: 1, active: true },
    ])
    expect(compact_view.home.products.map((product) => product.id)).toEqual(['computer-product'])
  })

  it('should mark the active category chip from state without mutating navigation counts', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'draft-kitchen-product', status: 'draft', name: '廚房草稿', category_id: 'kitchen' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
    ]

    const compact_view = getCompactView(products, { active_tab: 'home' })

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

    const compact_view = getCompactView([], { active_tab: 'guide' }, test_links, guides)

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

  it('should expose published card count via navigation counts', () => {
    const products = [
      makeProduct({ id: 'one', status: 'published', name: '一號' }),
      makeProduct({ id: 'two', status: 'published', name: '二號' }),
      makeProduct({ id: 'draft', status: 'draft', name: '草稿' }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.counts.published).toBe(2)
    expect(compact_view.home.products).toHaveLength(2)
  })

  it('should expose empty home reasons for no products and no filtered results', () => {
    expect(getCompactView([]).home.empty_reason).toBe('no-products')

    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
    ]

    expect(getCompactView(products, { home_category_id: 'computer' }).home.empty_reason).toBe('no-results')
    expect(getCompactView(products, { home_category_id: 'home' }).home.empty_reason).toBeNull()
  })

  it('should expose the fallback other category label in compact category chips', () => {
    const products = [
      makeProduct({ id: 'other-product', status: 'published', name: '未知分類商品', category_id: 'other' }),
    ]

    const compact_view = getCompactView(products, { home_category_id: 'other' })

    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 1, active: false },
      { id: 'other', label: '其他', count: 1, active: true },
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
    const route_state = getCompactAppStateFromRoute(
      { path: '/', query: { category: 'audio-gear' } },
      { category_ids: taxonomies.categories.map((category) => category.id) },
    )

    const compact_view = getCompactView(products, route_state, test_links, test_guides, taxonomies)

    expect(route_state.home_category_id).toBe('audio-gear')
    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 1, active: false },
      { id: 'audio-gear', label: '音響', count: 1, active: true },
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

    const compact_view = getCompactView([], {}, links)

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

describe('route-driven compact app state', () => {
  it('should derive active compact tab from route path', () => {
    expect(getCompactAppStateFromRoute({ path: '/', query: {} })).toEqual({
      active_tab: 'home',
      home_category_id: 'all',
    })
    expect(getCompactAppStateFromRoute({ path: '/guide', query: {} })).toEqual({
      active_tab: 'guide',
    })
    expect(getCompactAppStateFromRoute({ path: '/search', query: {} })).toEqual({
      active_tab: 'search',
      search_query: '',
    })
    expect(getCompactAppStateFromRoute({ path: '/links', query: {} })).toEqual({
      active_tab: 'links',
    })
  })

  it('should parse valid category and search query values from route query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'computer' } },
      { category_ids: ['home', 'computer'], tag_labels: [] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'computer',
    })

    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: '  機械鍵盤  ' } })).toEqual({
      active_tab: 'search',
      search_query: '機械鍵盤',
    })
  })

  it('should parse category ids from caller supplied taxonomy ids only', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'audio-gear' } },
      { category_ids: ['home', 'audio-gear'] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'audio-gear',
    })

    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'audio-gear' } },
      { category_ids: ['home'] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'all',
    })
  })

  it('should fallback invalid or empty query values to the route defaults', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'missing' } },
      { category_ids: ['home', 'computer'], tag_labels: [] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'all',
    })
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: ['不存在', '影音'] } },
      { category_ids: [], tag_labels: ['影音'] },
    )).toEqual({ active_tab: 'guide' })
    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: ['  ', 'ignored'] } })).toEqual({
      active_tab: 'search',
      search_query: '',
    })
  })

  it('should ignore a single guide tag delivered as a Vue Router string query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: '工作' } },
      { tag_labels: ['工作'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })

  it('should ignore multiple guide tags delivered as a Vue Router array query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: ['工作', '輸入'] } },
      { tag_labels: ['工作', '輸入'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })

  it('should not create a guide tag URL contract for labels containing commas', () => {
    const tag_with_comma = 'a,b'
    const selected_tags = ['a,b', 'c']
    const round_tripped_query = { tags: selected_tags }

    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: round_tripped_query },
      { tag_labels: [tag_with_comma, 'c'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })
})
