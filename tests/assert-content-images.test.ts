import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { assertContentImages } from '../scripts/assert-content-images'

const temp_roots: string[] = []

afterEach(() => {
  for (const root of temp_roots) {
    rmSync(root, { recursive: true, force: true })
  }

  temp_roots.length = 0
})

type ProductOverrides = {
  status?: string
  image_file?: string | null
}

function makeProductJson(overrides: ProductOverrides = {}) {
  return {
    status: overrides.status ?? 'published',
    name: '範例商品',
    english_name: 'Sample Product',
    summary: '短評',
    long_description: '長描述',
    llm_description: '',
    search_aliases: [],
    model_numbers: [],
    offers: [
      {
        channel_id: 'other',
        url: 'https://example.com/product',
        price_text: 'NT$ 1,990',
        price: { amount: 1990, currency: 'TWD', unit: 'each', label: null },
        checked_at: '2026-06-02T00:00:00+08:00',
      },
    ],
    image_file: overrides.image_file === undefined ? 'sample-product.jpg' : overrides.image_file,
    image_url: null,
    category_id: 'other',
    tag_ids: [],
    reference_url: null,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  }
}

async function makeFixtureProject() {
  const root = mkdtempSync(join(tmpdir(), 'dwselect-assert-content-images-'))
  temp_roots.push(root)
  const products_dir = join(root, 'content', 'products')
  const guides_dir = join(root, 'content', 'guides')
  const links_dir = join(root, 'content', 'links')
  const taxonomies_dir = join(root, 'content', 'taxonomies')
  await mkdir(join(products_dir, 'images'), { recursive: true })
  await mkdir(join(guides_dir, 'images'), { recursive: true })
  await mkdir(links_dir, { recursive: true })
  await mkdir(taxonomies_dir, { recursive: true })

  for (const file_name of ['categories.json', 'channels.json', 'tags.json', 'brands.json']) {
    writeFileSync(join(taxonomies_dir, file_name), JSON.stringify({ items: [] }))
  }

  return { root, products_dir, guides_dir, links_dir, taxonomies_dir }
}

function dirsFor(fixture: Awaited<ReturnType<typeof makeFixtureProject>>) {
  return {
    products_dir: fixture.products_dir,
    guides_dir: fixture.guides_dir,
    links_dir: fixture.links_dir,
    taxonomies_dir: fixture.taxonomies_dir,
  }
}

describe('assert-content-images', () => {
  it('should pass when every published product/guide image file exists', async () => {
    const fixture = await makeFixtureProject()
    writeFileSync(join(fixture.products_dir, 'sample-product.json'), JSON.stringify(makeProductJson()))
    writeFileSync(join(fixture.products_dir, 'images', 'sample-product.jpg'), 'binary')

    const summary = await assertContentImages(dirsFor(fixture))

    expect(summary.checked).toBe(1)
    expect(summary.missing).toEqual([])
  })

  it('should throw when a published product image file is missing', async () => {
    const fixture = await makeFixtureProject()
    writeFileSync(join(fixture.products_dir, 'missing-image-product.json'), JSON.stringify(makeProductJson()))

    await expect(assertContentImages(dirsFor(fixture))).rejects.toThrow(/Missing 1 published content image source file/)
  })

  it('should ignore unpublished products with missing images', async () => {
    const fixture = await makeFixtureProject()
    writeFileSync(join(fixture.products_dir, 'draft-product.json'), JSON.stringify(makeProductJson({ status: 'draft' })))

    const summary = await assertContentImages(dirsFor(fixture))

    expect(summary.checked).toBe(0)
    expect(summary.missing).toEqual([])
  })
})
