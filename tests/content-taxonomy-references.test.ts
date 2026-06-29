import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'

import { category_taxonomy_schema, channel_taxonomy_schema, tag_taxonomy_schema, validateContentTaxonomyReferences } from '../app/utils/product-schema'
import { readContentGuides, readContentLinks, readContentProducts } from './published-products/fixtures'

const taxonomies_dir_url = new URL('../content/taxonomies/', import.meta.url)

function readTaxonomy(file_name: string) {
  return JSON.parse(readFileSync(new URL(file_name, taxonomies_dir_url), 'utf8'))
}

function readTaxonomies() {
  return {
    categories: category_taxonomy_schema.parse(readTaxonomy('categories.json')).items,
    tags: tag_taxonomy_schema.parse(readTaxonomy('tags.json')).items,
    brands: tag_taxonomy_schema.parse(readTaxonomy('brands.json')).items,
    channels: channel_taxonomy_schema.parse(readTaxonomy('channels.json')).items,
  }
}

describe('post-migration product content', () => {
  it('should validate content references with product-only brand tag support', () => {
    const { categories, tags, brands, channels } = readTaxonomies()

    expect(validateContentTaxonomyReferences({
      products: readContentProducts(),
      guides: readContentGuides(),
      links: readContentLinks(),
      categories,
      tags,
      channels,
      brands,
    })).toEqual([])
  })

  it('should flag a product offer that references a channel id absent from channels.json', () => {
    const { categories, tags, brands, channels } = readTaxonomies()
    const sample_product = readContentProducts()[0]
    const product_with_bad_channel = {
      ...sample_product,
      id: 'synthetic-bad-channel-product',
      offers: [{ ...sample_product.offers[0], channel_id: 'nonexistent-channel' }],
    }

    const violations = validateContentTaxonomyReferences({
      products: [product_with_bad_channel],
      guides: [],
      links: [],
      categories,
      tags,
      channels,
      brands,
    })

    expect(violations).toContainEqual({
      content_type: 'product',
      content_id: 'synthetic-bad-channel-product',
      field: 'channel_id',
      value: 'nonexistent-channel',
    })
  })
})
