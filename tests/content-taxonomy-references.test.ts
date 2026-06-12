import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'

import { category_taxonomy_schema, tag_taxonomy_schema, validateContentTaxonomyReferences } from '../app/utils/product-schema'
import { readContentGuides, readContentLinks, readContentProducts } from './published-products/fixtures'

const taxonomies_dir_url = new URL('../content/taxonomies/', import.meta.url)

function readTaxonomy(file_name: string) {
  return JSON.parse(readFileSync(new URL(file_name, taxonomies_dir_url), 'utf8'))
}

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
      '2026-06-02-ikea充電線',
      '2026-06-02-三菱重工冷氣',
    ]))
    expect(product_ids).toEqual(expect.arrayContaining([
      '2026-06-02-ikea-charging-cable',
      '2026-06-02-mitsubishi-heavy-industries-air-conditioner',
      '2026-06-02-sharp-65-inch-xled',
    ]))
    expect(products.every((product) => Array.isArray(product.tag_ids) && !('tags' in product))).toBe(true)
    expect(products.map((product) => product.category_id)).not.toEqual(expect.arrayContaining([
      'home',
      'kitchen',
      'computer',
      'three-c',
      'av',
      'food',
    ]))
    expect(products.some((product) => product.tag_ids.includes('sharp'))).toBe(true)
  })

  it('should validate content references with product-only brand tag support', () => {
    const categories = category_taxonomy_schema.parse(readTaxonomy('categories.json')).items
    const tags = tag_taxonomy_schema.parse(readTaxonomy('tags.json')).items
    const brands = tag_taxonomy_schema.parse(readTaxonomy('brands.json')).items

    expect(validateContentTaxonomyReferences({
      products: readContentProducts(),
      guides: readContentGuides(),
      links: readContentLinks(),
      categories,
      tags,
      brands,
    })).toEqual([])
  })
})
