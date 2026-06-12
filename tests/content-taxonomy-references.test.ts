import { describe, expect, it } from 'vitest'

import { readContentProducts } from './published-products/fixtures'

describe('post-migration product content', () => {
  it('should keep only product content with taxonomy tag ids after Milestone 2 migration', () => {
    const products = readContentProducts()
    const product_ids = products.map((product) => product.id)

    expect(products).toHaveLength(62)
    expect(product_ids).not.toContain('2026-06-02-sample-product')
    expect(product_ids).not.toEqual(expect.arrayContaining([
      '2026-06-02-日本米入門篇',
      '2026-06-02-aeron-chair',
      '2026-06-02-b18',
      '2026-06-02-altwork-station',
    ]))
    expect(product_ids).toEqual(expect.arrayContaining([
      '2026-06-02-ikea充電線',
      '2026-06-02-三菱重工冷氣',
    ]))
    expect(products.every((product) => Array.isArray(product.tag_ids) && !('tags' in product))).toBe(true)
  })
})
