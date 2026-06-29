import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readProducts } from '../scripts/content-reader'

function buildProductJson(name: string) {
  return JSON.stringify({
    // slug 須為 ASCII kebab（AC1c）；name 為顯示字串，兩者刻意不同以反映 schema 契約。
    slug: name.toLowerCase(),
    status: 'published',
    name,
    english_name: name,
    summary: 'summary',
    long_description: 'long description',
    llm_description: '',
    search_aliases: [],
    model_numbers: [],
    offers: [
      {
        channel_id: 'pchome',
        url: 'https://example.com/prod',
        price_text: '500',
        price: {
          amount: 500,
          currency: 'TWD',
          unit: 'each',
          label: null,
        },
        checked_at: '2026-06-02T00:00:00+08:00',
      },
    ],
    image_url: null,
    category_id: 'computer-3c',
    tag_ids: [],
    reference_url: null,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
    image_file: `${name}.jpg`,
  })
}

describe('readContentFiles (via readProducts)', () => {
  const temp_dirs: string[] = []

  afterEach(async () => {
    while (temp_dirs.length > 0) {
      await rm(temp_dirs.pop()!, { recursive: true, force: true })
    }
  })

  async function makeTempDir() {
    const dir = await mkdtemp(join(tmpdir(), 'dwselect-content-reader-'))
    temp_dirs.push(dir)
    return dir
  }

  it('returns items ordered by file name ascending (localeCompare)', async () => {
    const dir = await makeTempDir()
    await writeFile(join(dir, 'charlie.json'), buildProductJson('Charlie'), 'utf8')
    await writeFile(join(dir, 'alpha.json'), buildProductJson('Alpha'), 'utf8')
    await writeFile(join(dir, 'bravo.json'), buildProductJson('Bravo'), 'utf8')

    const products = await readProducts(dir)

    expect(products.map((product) => product.id)).toEqual(['alpha', 'bravo', 'charlie'])
  })

  it('ignores non-json entries', async () => {
    const dir = await makeTempDir()
    await writeFile(join(dir, 'keep.json'), buildProductJson('Keep'), 'utf8')
    await writeFile(join(dir, 'notes.txt'), 'not json', 'utf8')
    await writeFile(join(dir, 'data.json.bak'), 'not json', 'utf8')

    const products = await readProducts(dir)

    expect(products.map((product) => product.id)).toEqual(['keep'])
  })

  it('returns an empty array when the directory does not exist (ENOENT)', async () => {
    const dir = await makeTempDir()

    const products = await readProducts(join(dir, 'does-not-exist'))

    expect(products).toEqual([])
  })

  it('rejects when one of the json files is malformed', async () => {
    const dir = await makeTempDir()
    await writeFile(join(dir, 'good.json'), buildProductJson('Good'), 'utf8')
    await writeFile(join(dir, 'broken.json'), '{ not valid json', 'utf8')

    await expect(readProducts(dir)).rejects.toThrow()
  })
})
