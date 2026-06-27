import { describe, expect, it } from 'vitest'

import { getSelectableCategoryIds } from '../../app/utils/published-products/selectable-category-ids'
import { getCompactAppStateFromRoute } from '../../app/utils/published-products/compact-app'
import { buildPublicContentPayload } from '../../scripts/public-content'
import type { TaxonomyDefinitions } from '../../app/utils/published-products/types'
import { makeProduct, test_guides, test_links, test_taxonomies } from './fixtures'

describe('getSelectableCategoryIds', () => {
  it('should return chip ids excluding the all chip', () => {
    const category_chips = [
      { id: 'all' as const, label: '全部', count: 3 },
      { id: 'home', label: '居家', count: 1 },
      { id: 'computer', label: '電腦', count: 2 },
    ]

    expect(getSelectableCategoryIds(category_chips)).toEqual(['home', 'computer'])
  })

  it('should return an empty array when only the all chip is present', () => {
    const category_chips = [{ id: 'all' as const, label: '全部', count: 0 }]

    expect(getSelectableCategoryIds(category_chips)).toEqual([])
  })
})

describe('selectable category ids no longer drive home route filtering', () => {
  function buildSelectableCategoryIds(
    products: ReturnType<typeof makeProduct>[],
    taxonomies: TaxonomyDefinitions = test_taxonomies,
  ) {
    const payload = buildPublicContentPayload({ products, guides: test_guides, links: test_links, taxonomies })

    return getSelectableCategoryIds(payload.navigation.category_chips)
  }

  it('should ignore a category that is rendered as a visible chip', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
    ]
    const category_ids = buildSelectableCategoryIds(products)

    expect(category_ids).toEqual(['home'])
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'home' } },
    )).toEqual({
      active_tab: 'home',
    })
  })

  it('should ignore a category that exists in taxonomies but has no published products', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
    ]
    const category_ids = buildSelectableCategoryIds(products)

    expect(category_ids).not.toContain('computer')
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'computer' } },
    )).toEqual({
      active_tab: 'home',
    })
  })

  it('should ignore a category that exists in taxonomies but is not nav visible', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      categories: [
        ...test_taxonomies.categories,
        { id: 'hidden-cat', label: '隱藏分類', short_label: '隱藏', nav_visible: false, sort_order: 70 },
      ],
    }
    const products = [
      makeProduct({ id: 'hidden-product', status: 'published', name: '隱藏商品', category_id: 'hidden-cat' }),
    ]
    const category_ids = buildSelectableCategoryIds(products, taxonomies)

    expect(category_ids).not.toContain('hidden-cat')
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'hidden-cat' } },
    )).toEqual({
      active_tab: 'home',
    })
  })

  it('should ignore a category id that does not exist at all', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
    ]
    const category_ids = buildSelectableCategoryIds(products)

    expect(category_ids).not.toContain('does-not-exist')
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'does-not-exist' } },
    )).toEqual({
      active_tab: 'home',
    })
  })

  it('should ignore all, empty and array category query values', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'all' } },
    )).toEqual({
      active_tab: 'home',
    })
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: '' } },
    )).toEqual({
      active_tab: 'home',
    })
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: ['home', 'computer'] } },
    )).toEqual({
      active_tab: 'home',
    })
  })
})
