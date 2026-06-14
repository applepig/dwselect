import { describe, expect, it } from 'vitest'

import { getCompactAppStateFromRoute, getCompactAppView, getCompactCategoryOptions } from '../../app/utils/published-products/compact-app'
import type { CompactAppState, TaxonomyDefinitions } from '../../app/utils/published-products/types'
import type { Guide, LinkDefinition } from '../../app/utils/product-schema'
import { base_guide, makeProduct, test_guides, test_links, test_taxonomies } from './fixtures'

describe('compact app view state', () => {
  function getCompactView(products: ReturnType<typeof makeProduct>[], state: CompactAppState = {}, links = test_links, guides = test_guides) {
    return getCompactAppView(products, state, test_taxonomies, links, guides)
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

  it('should share compact category options between home chips and desktop sidebar', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'draft-kitchen-product', status: 'draft', name: '廚房草稿', category_id: 'kitchen' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
    ]

    const shared_category_options = getCompactCategoryOptions(products, 'all', test_taxonomies)
    const compact_view = getCompactView(products, { active_tab: 'home' })

    expect(shared_category_options).toEqual([
      { id: 'all', label: '全部', count: 2, active: true },
      { id: 'home', label: '居家', count: 1, active: false },
      { id: 'computer', label: '電腦', count: 1, active: false },
    ])
    expect(compact_view.home.category_chips).toEqual(shared_category_options)
    expect(shared_category_options.map((option) => option.id)).not.toContain('kitchen')
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
        href: 'https://example.com/published-guide',
        image_url: null,
        icon: 'i-lucide-book-open',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ])
    expect(compact_view.guide.empty_reason).toBeNull()
  })

  it('should expose top tags ordered by usage and label', () => {
    const products = [
      makeProduct({ id: 'one', status: 'published', name: '一號', tag_ids: ['影音', '工作'] }),
      makeProduct({ id: 'two', status: 'published', name: '二號', tag_ids: ['影音', '居家'] }),
      makeProduct({ id: 'three', status: 'published', name: '三號', tag_ids: ['工作'] }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.top_tags).toEqual([
      { label: '工作', count: 2, active: false },
      { label: '影音', count: 2, active: false },
      { label: '居家', count: 1, active: false },
      { label: '輸入', count: 1, active: false },
    ])
  })

  it('should expose top tags from published products, guides and links with taxonomy labels and a 10 item limit', () => {
    const tag_ids = Array.from({ length: 12 }, (_, index) => `tag-${index + 1}`)
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      tags: tag_ids.map((tag_id, index) => ({
        id: tag_id,
        label: index === 0 ? 'Alpha' : `標籤 ${String(index + 1).padStart(2, '0')}`,
        description: tag_id,
        aliases: [],
        nav_visible: true,
        sort_order: index + 1,
      })),
    }
    const products = [
      makeProduct({ id: 'published-product', status: 'published', name: '已上架商品', tag_ids }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', tag_ids: ['tag-1'] }),
    ]
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        tag_ids: ['tag-1', 'tag-2'],
      },
      {
        ...base_guide,
        id: 'draft-guide',
        status: 'draft',
        tag_ids: ['tag-1'],
      },
    ]
    const links: LinkDefinition[] = [
      {
        ...test_links[0]!,
        id: 'published-link',
        tag_ids: ['tag-2', 'tag-3'],
      },
      {
        ...test_links[0]!,
        id: 'archived-link',
        status: 'archived',
        tag_ids: ['tag-1'],
      },
    ]

    const compact_view = getCompactView(products, {}, links, guides)
    const compact_view_with_taxonomies = getCompactAppView(products, {}, taxonomies, links, guides)

    expect(compact_view_with_taxonomies.top_tags).toEqual([
      { label: '標籤 02', count: 3, active: false },
      { label: 'Alpha', count: 2, active: false },
      { label: '標籤 03', count: 2, active: false },
      { label: '標籤 04', count: 1, active: false },
      { label: '標籤 05', count: 1, active: false },
      { label: '標籤 06', count: 1, active: false },
      { label: '標籤 07', count: 1, active: false },
      { label: '標籤 08', count: 1, active: false },
      { label: '標籤 09', count: 1, active: false },
      { label: '標籤 10', count: 1, active: false },
    ])
    expect(compact_view.top_tags).toHaveLength(10)
  })

  it('should filter search tab by query and expose empty and no-results states', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '打字工作用', tag_ids: ['輸入'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', summary: '影音用', category_id: 'av', tag_ids: ['影音'] }),
    ]

    expect(getCompactView(products, { search_query: '' }).search.empty_reason).toBe('empty-query')
    expect(getCompactView(products, { search_query: '工作' }).search.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(getCompactView(products, { search_query: '不存在' }).search.empty_reason).toBe('no-results')
  })

  it('should use static search result ids for the search tab when the client index succeeds', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '本機 fallback 找不到這個查詢' }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', category_id: 'av', summary: '本機 fallback 也找不到' }),
      makeProduct({ id: 'draft-match', status: 'draft', name: '草稿商品' }),
    ]

    const compact_view = getCompactView(products, {
      search_query: 'static-index-only',
      search_result_ids: ['speaker', 'keyboard', 'draft-match'],
    })

    expect(compact_view.search.products.map((product) => product.id)).toEqual(['speaker', 'keyboard'])
    expect(compact_view.search.empty_reason).toBeNull()
  })

  it('should fallback to loaded Nuxt Content products when the client search index fails', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '打字工作用', tag_ids: ['輸入'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', summary: '影音用', category_id: 'av', tag_ids: ['影音'] }),
    ]

    const compact_view = getCompactView(products, {
      search_query: '工作',
      search_result_ids: null,
    })

    expect(compact_view.search.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(compact_view.search.empty_reason).toBeNull()
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

    const compact_view = getCompactAppView(products, route_state, taxonomies, test_links, test_guides)

    expect(route_state.home_category_id).toBe('audio-gear')
    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 1, active: false },
      { id: 'audio-gear', label: '音響', count: 1, active: true },
    ])
    expect(compact_view.home.category_chips.map((chip) => chip.id)).not.toContain('empty-new-category')
    expect(compact_view.home.products).toEqual([
      expect.objectContaining({
        id: 'audio-product',
        category: '音響器材',
        tags: ['Fixture Brand'],
      }),
    ])
  })

  it('should expose only published link resources with safe external link attributes', () => {
    const compact_view = getCompactView([], {}, [
      ...test_links,
      {
        ...test_links[0]!,
        id: 'draft-link',
        status: 'draft',
        title: '草稿連結',
        sort_order: 1,
      },
    ])

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
    // Vue Router serialises an array query as repeated params and parses it back to an array.
    const round_tripped_query = { tags: selected_tags }

    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: round_tripped_query },
      { tag_labels: [tag_with_comma, 'c'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })
})
