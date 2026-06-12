import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getImageExtension,
  localizeContentImages,
  type LocalizedImageSummary,
} from '../scripts/localize-content-images'

function createFixtureDirs() {
  const root = mkdtempSync(join(tmpdir(), 'dwselect-localize-content-images-'))
  const products_dir = join(root, 'products')
  const guides_dir = join(root, 'guides')
  const cleanup_paths: string[] = [root]

  mkdirSync(products_dir, { recursive: true })
  mkdirSync(guides_dir, { recursive: true })

  return { root, products_dir, guides_dir, cleanup_paths }
}

function cleanupTempRoot(roots: string[]) {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true })
  }
}

function writeProductFile(products_dir: string, id: string, body: Record<string, unknown>) {
  writeFileSync(join(products_dir, `${id}.json`), `${JSON.stringify(body, null, 2)}\n`)
}

describe('localize-content-images', () => {
  const temp_roots: string[] = []

  afterEach(() => {
    cleanupTempRoot(temp_roots)
    temp_roots.length = 0
  })

  it('should localize external HTTP(S) image URLs and rewrite content image_url', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const id = '2026-06-02-sample-product'
    const source_image_url = 'https://cdn.example.com/images/sample.jpg'
    const image_payload = Buffer.from([0x01, 0x02, 0x03])
    const fetcher = vi.fn().mockResolvedValue(
      new Response(image_payload, {
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
        },
      }),
    )

    writeProductFile(products_dir, id, {
      id,
      status: 'published',
      name: '測試商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: source_image_url,
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
      timeout_ms: 2000,
    })

    const updated_content = JSON.parse(readFileSync(join(products_dir, `${id}.json`), 'utf8')) as {
      image_url: string
    }

    expect(summary).toEqual({
      localized: 1,
      skipped: 0,
      failed: 0,
      failures: [],
      warnings: [],
    } satisfies LocalizedImageSummary)
    expect(updated_content.image_url).toBe('/images/products/2026-06-02-sample-product.jpg')
    expect(existsSync(join(products_dir, 'images', '2026-06-02-sample-product.jpg'))).toBe(true)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('should skip content already on /images/* paths and avoid download calls', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const fetcher = vi.fn()

    writeProductFile(products_dir, '2026-06-02-local-product', {
      id: '2026-06-02-local-product',
      status: 'published',
      name: '已本地化商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: '/images/products/2026-06-02-local-product.jpg',
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    writeProductFile(guides_dir, '2026-06-02-local-guide', {
      id: '2026-06-02-local-guide',
      status: 'published',
      title: '已本地化指南',
      summary: '指南摘要',
      source_url: 'https://example.com/guide',
      image_url: '/images/guides/2026-06-02-local-guide.png',
      category_ids: ['home'],
      tag_ids: ['tag-a'],
      related_product_ids: [],
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
    })

    expect(summary).toEqual({
      localized: 0,
      skipped: 2,
      failed: 0,
      failures: [],
      warnings: [],
    } satisfies LocalizedImageSummary)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should fail with unsupported content type and keep the original image_url', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const id = '2026-06-02-unsupported-content-type'
    const fetcher = vi.fn().mockResolvedValue(new Response('not an image', {
      status: 200,
      headers: {
        'content-type': 'text/html',
      },
    }))

    writeProductFile(products_dir, id, {
      id,
      status: 'published',
      name: '測試商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: 'https://example.com/image',
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
    })

    const updated_content = JSON.parse(readFileSync(join(products_dir, `${id}.json`), 'utf8')) as {
      image_url: string
    }

    expect(summary.failed).toBe(1)
    expect(summary.skipped).toBe(0)
    expect(summary.localized).toBe(0)
    expect(summary.warnings).toEqual([])
    expect(summary.failures).toEqual([
      {
        file_path: `products/${id}.json`,
        image_url: 'https://example.com/image',
        reason: expect.stringContaining('unsupported content-type'),
      },
    ])
    expect(updated_content.image_url).toBe('https://example.com/image')
    expect(existsSync(join(products_dir, 'images', `${id}.jpg`))).toBe(false)
  })

  it('should fail when the response is HTTP error', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const id = '2026-06-02-http-error'
    const fetcher = vi.fn().mockResolvedValue(new Response('not found', {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'content-type': 'text/plain',
      },
    }))

    writeProductFile(products_dir, id, {
      id,
      status: 'published',
      name: '測試商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: 'https://example.com/image.jpg',
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
    })

    expect(summary.failed).toBe(1)
    expect(summary.warnings).toEqual([])
    expect(summary.failures[0]).toEqual(
      expect.objectContaining({
        file_path: `products/${id}.json`,
        reason: 'HTTP 403',
      }),
    )
  })

  it('should support dry-run mode without writing image or updated content', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const id = '2026-06-02-dry-run'
    const fetcher = vi.fn().mockResolvedValue(
      new Response(Buffer.from([0x01, 0x02, 0x03]), {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      }),
    )

    writeProductFile(products_dir, id, {
      id,
      status: 'published',
      name: '測試商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: 'https://example.com/image.png',
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
      dry_run: true,
    })

    const updated_content = JSON.parse(readFileSync(join(products_dir, `${id}.json`), 'utf8')) as {
      image_url: string
    }

    expect(summary).toEqual({
      localized: 1,
      skipped: 0,
      failed: 0,
      failures: [],
      warnings: [],
    } satisfies LocalizedImageSummary)
    expect(updated_content.image_url).toBe('https://example.com/image.png')
    expect(existsSync(join(products_dir, 'images', `${id}.png`))).toBe(false)
  })

  it('should extract image extensions from content type and URL fallback', () => {
    expect(getImageExtension('https://example.com/image', 'image/jpeg')).toBe('jpg')
    expect(getImageExtension('https://example.com/image.jpeg', 'application/octet-stream')).toBe(null)
    expect(getImageExtension('https://example.com/image.webp', 'image/webp')).toBe('webp')
    expect(getImageExtension('https://example.com/image.jpeg?foo=1', 'image/jpeg')).toBe('jpg')
    expect(getImageExtension('https://example.com/image.jpg', 'image/bmp')).toBe('jpg')
  })

  it('should localize images larger than 2 MB and report a size warning', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const id = '2026-06-02-large-image'
    const image_payload = Buffer.alloc((2 * 1024 * 1024) + 1, 0x01)
    const fetcher = vi.fn().mockResolvedValue(new Response(image_payload, {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
    }))

    writeProductFile(products_dir, id, {
      id,
      status: 'published',
      name: '大圖商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: 'https://example.com/large-image.png',
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
    })
    const updated_content = JSON.parse(readFileSync(join(products_dir, `${id}.json`), 'utf8')) as {
      image_url: string
    }

    expect(summary).toEqual({
      localized: 1,
      skipped: 0,
      failed: 0,
      failures: [],
      warnings: [
        {
          file_path: `products/${id}.json`,
          image_url: 'https://example.com/large-image.png',
          reason: 'image larger than 2 MB',
          size_bytes: image_payload.byteLength,
        },
      ],
    } satisfies LocalizedImageSummary)
    expect(updated_content.image_url).toBe(`/images/products/${id}.png`)
    expect(readFileSync(join(products_dir, 'images', `${id}.png`))).toHaveLength(image_payload.byteLength)
  })

  it('should skip null image_url values without fetching', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const fetcher = vi.fn()

    writeProductFile(guides_dir, '2026-06-02-null-guide-image', {
      id: '2026-06-02-null-guide-image',
      status: 'published',
      title: '無圖指南',
      summary: '指南摘要',
      source_url: 'https://example.com/guide',
      image_url: null,
      category_ids: ['home'],
      tag_ids: ['tag-a'],
      related_product_ids: [],
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
    })

    expect(summary).toEqual({
      localized: 0,
      skipped: 1,
      failed: 0,
      failures: [],
      warnings: [],
    } satisfies LocalizedImageSummary)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should report timeout failures when fetch is aborted', async () => {
    const { products_dir, guides_dir, cleanup_paths } = createFixtureDirs()
    temp_roots.push(...cleanup_paths)

    const id = '2026-06-02-timeout-image'
    const abort_error = new Error('The operation was aborted')
    abort_error.name = 'AbortError'
    const fetcher = vi.fn().mockRejectedValue(abort_error)

    writeProductFile(products_dir, id, {
      id,
      status: 'published',
      name: '逾時商品',
      price_text: 'NT$ 1,900',
      price: {
        amount: 1900,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '測試摘要',
      description: '測試描述',
      purchase_url: 'https://example.com',
      image_url: 'https://example.com/timeout.jpg',
      channel_id: 'other',
      category_id: 'home',
      tag_ids: ['tag-a'],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
    })

    const summary = await localizeContentImages({
      products_dir,
      guides_dir,
      fetcher,
      timeout_ms: 25,
    })
    const updated_content = JSON.parse(readFileSync(join(products_dir, `${id}.json`), 'utf8')) as {
      image_url: string
    }

    expect(summary).toEqual({
      localized: 0,
      skipped: 0,
      failed: 1,
      failures: [
        {
          file_path: `products/${id}.json`,
          image_url: 'https://example.com/timeout.jpg',
          reason: 'timeout after 25ms',
        },
      ],
      warnings: [],
    } satisfies LocalizedImageSummary)
    expect(updated_content.image_url).toBe('https://example.com/timeout.jpg')
  })
})
