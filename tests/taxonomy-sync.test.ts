import { readFileSync, readdirSync } from 'node:fs'
import { parse } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CATEGORY_IDS, CHANNEL_IDS, category_taxonomy_schema, channel_taxonomy_schema, link_schema, tag_taxonomy_schema } from '../app/utils/product-schema'
import { DEFAULT_LINKS } from '../app/utils/published-products/compact-app'
import { DEFAULT_TAXONOMIES } from '../app/utils/published-products/shared'

const taxonomies_dir_url = new URL('../content/taxonomies/', import.meta.url)
const links_dir_url = new URL('../content/links/', import.meta.url)

function readTaxonomy(file_name: string) {
  return JSON.parse(readFileSync(new URL(file_name, taxonomies_dir_url), 'utf8'))
}

function readContentLinks() {
  return readdirSync(links_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => link_schema.parse({
      ...JSON.parse(readFileSync(new URL(file_name, links_dir_url), 'utf8')),
      id: parse(file_name).name,
    }))
}

describe('taxonomy synchronization', () => {
  it('keeps product schema category and channel literals aligned with taxonomy JSON', () => {
    const categories = category_taxonomy_schema.parse(readTaxonomy('categories.json')).items
    const channels = channel_taxonomy_schema.parse(readTaxonomy('channels.json')).items

    expect(CATEGORY_IDS).toEqual(categories.map((category) => category.id))
    expect(CHANNEL_IDS).toEqual(channels.map((channel) => channel.id))
  })

  it('keeps published-products fallback taxonomies aligned with taxonomy JSON', () => {
    const categories = category_taxonomy_schema.parse(readTaxonomy('categories.json')).items
    const channels = channel_taxonomy_schema.parse(readTaxonomy('channels.json')).items
    const tags = tag_taxonomy_schema.parse(readTaxonomy('tags.json')).items

    expect(DEFAULT_TAXONOMIES).toEqual({
      categories,
      channels,
      tags,
    })
  })

  it('keeps published-products fallback links aligned with content links JSON', () => {
    expect(DEFAULT_LINKS).toEqual(readContentLinks())
  })
})
