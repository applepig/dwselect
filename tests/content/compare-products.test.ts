import { describe, expect, it } from 'vitest'

import type { Product } from '../../app/utils/product-schema'
import type { TaxonomyDefinitions } from '../../app/utils/published-products/types'
import { compareProducts } from '../../app/utils/content/compare-products'
import { makeProduct, test_taxonomies } from '../published-products/fixtures'

const taxonomies: TaxonomyDefinitions = test_taxonomies

function sortProducts(products: Product[]): string[] {
  return products
    .toSorted((left, right) => compareProducts(left, right, taxonomies))
    .map((product) => product.id)
}

describe('compareProducts (canonical)', () => {
  it('should order by category sort_order first', () => {
    const home_product = makeProduct({ id: 'home-product', status: 'published', name: '商品', category_id: 'home' })
    const computer_product = makeProduct({ id: 'computer-product', status: 'published', name: '商品', category_id: 'computer' })

    expect(sortProducts([computer_product, home_product])).toEqual(['home-product', 'computer-product'])
  })

  it('should order by published_at descending within the same category', () => {
    const older = makeProduct({ id: 'older', status: 'published', name: '商品', category_id: 'home', published_at: '2026-06-01T00:00:00+08:00' })
    const newer = makeProduct({ id: 'newer', status: 'published', name: '商品', category_id: 'home', published_at: '2026-06-05T00:00:00+08:00' })

    expect(sortProducts([older, newer])).toEqual(['newer', 'older'])
  })

  it('should sort null published_at last within the same category', () => {
    const dated = makeProduct({ id: 'dated', status: 'published', name: '商品', category_id: 'home', published_at: '2026-06-01T00:00:00+08:00' })
    const undated = makeProduct({ id: 'undated', status: 'published', name: '商品', category_id: 'home', published_at: null })

    expect(sortProducts([undated, dated])).toEqual(['dated', 'undated'])
  })

  it('should tie-break by name using compareText when category and published_at match', () => {
    const banana = makeProduct({ id: 'banana', status: 'published', name: 'banana', category_id: 'home', published_at: '2026-06-01T00:00:00+08:00' })
    const apple = makeProduct({ id: 'apple', status: 'published', name: 'apple', category_id: 'home', published_at: '2026-06-01T00:00:00+08:00' })

    expect(sortProducts([banana, apple])).toEqual(['apple', 'banana'])
  })

  it('should NFKC normalize names in the tie-break so full-width digits compare equal to half-width', () => {
    const full_width = makeProduct({ id: 'full', status: 'published', name: 'Ｍ１', category_id: 'home', published_at: '2026-06-01T00:00:00+08:00' })
    const half_width = makeProduct({ id: 'half', status: 'published', name: 'M1', category_id: 'home', published_at: '2026-06-01T00:00:00+08:00' })

    expect(compareProducts(full_width, half_width, taxonomies)).toBe(0)
  })

  it('should treat an unknown category as the largest sort_order so it lands last', () => {
    const known = makeProduct({ id: 'known', status: 'published', name: '商品', category_id: 'home' })
    const unknown = makeProduct({ id: 'unknown', status: 'published', name: '商品', category_id: 'no-such-category' })

    expect(sortProducts([unknown, known])).toEqual(['known', 'unknown'])
  })
})
