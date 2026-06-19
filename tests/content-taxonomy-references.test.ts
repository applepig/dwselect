import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'

import { category_taxonomy_schema, tag_taxonomy_schema, validateContentTaxonomyReferences } from '../app/utils/product-schema'
import { readContentGuides, readContentLinks, readContentProducts } from './published-products/fixtures'

const taxonomies_dir_url = new URL('../content/taxonomies/', import.meta.url)

function readTaxonomy(file_name: string) {
  return JSON.parse(readFileSync(new URL(file_name, taxonomies_dir_url), 'utf8'))
}

describe('post-migration product content', () => {
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
