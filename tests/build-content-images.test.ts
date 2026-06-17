import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { buildContentImages } from '../scripts/build-content-images'

type WebpDimensions = {
  width: number
  height: number
}

const temp_roots: string[] = []

afterEach(() => {
  for (const root of temp_roots) {
    rmSync(root, { recursive: true, force: true })
  }

  temp_roots.length = 0
})

describe('build-content-images', () => {
  it('should write resized WebP assets for referenced product and guide image files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dwselect-build-content-images-'))
    temp_roots.push(root)
    const products_dir = join(root, 'content', 'products')
    const guides_dir = join(root, 'content', 'guides')
    const public_dir = join(root, 'public')
    await mkdir(join(products_dir, 'images'), { recursive: true })
    await mkdir(join(guides_dir, 'images'), { recursive: true })

    writeJson(join(products_dir, 'oversized-product.json'), {
      status: 'published',
      image_file: 'oversized-product.jpg',
      image_url: null,
    })
    writeJson(join(products_dir, 'external-product.json'), {
      status: 'published',
      image_url: 'https://example.com/product.jpg',
    })
    writeJson(join(guides_dir, 'guide-card.json'), {
      status: 'published',
      image_file: 'guide-card.png',
      image_url: null,
    })
    writeFileSync(join(products_dir, 'images', 'oversized-product.jpg'), createSvgImage(2400, 1200))
    writeFileSync(join(products_dir, 'images', 'unused-product.jpg'), createSvgImage(2000, 1000))
    writeFileSync(join(guides_dir, 'images', 'guide-card.png'), createSvgImage(900, 450))

    const summary = await buildContentImages({
      products_dir,
      guides_dir,
      public_dir,
      max_width: 1200,
    })

    const product_output_path = join(public_dir, 'images', 'products', 'oversized-product.webp')
    const guide_output_path = join(public_dir, 'images', 'guides', 'guide-card.webp')
    const product_dimensions = await readWebpDimensions(product_output_path)
    const guide_dimensions = await readWebpDimensions(guide_output_path)

    expect(summary).toMatchObject({
      optimized: 2,
      missing: 0,
      failed: 0,
    })
    expect(summary.outputs).toEqual(expect.arrayContaining([
      product_output_path,
      guide_output_path,
    ]))
    expect(summary.warnings).toEqual([])
    expect(existsSync(product_output_path)).toBe(true)
    expect(existsSync(guide_output_path)).toBe(true)
    expect(existsSync(join(public_dir, 'images', 'products', 'unused-product.webp'))).toBe(false)
    expect(product_dimensions).toEqual({ width: 1200, height: 600 })
    expect(guide_dimensions).toEqual({ width: 900, height: 450 })
    expect((await stat(product_output_path)).size).toBeGreaterThan(0)
  })

  it('should reject when a published content image file is missing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dwselect-build-content-images-missing-'))
    temp_roots.push(root)
    const products_dir = join(root, 'content', 'products')
    const guides_dir = join(root, 'content', 'guides')
    const public_dir = join(root, 'public')
    await mkdir(join(products_dir, 'images'), { recursive: true })
    await mkdir(join(guides_dir, 'images'), { recursive: true })

    writeJson(join(products_dir, 'missing-product.json'), {
      status: 'published',
      image_file: 'missing-product.jpg',
      image_url: null,
    })

    await expect(buildContentImages({ products_dir, guides_dir, public_dir })).rejects.toThrow(/Missing: 1/)
    expect(existsSync(join(public_dir, 'images', 'products', 'missing-product.webp'))).toBe(false)
  })

  it('should reject when sharp cannot optimize a published content image file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dwselect-build-content-images-failed-'))
    temp_roots.push(root)
    const products_dir = join(root, 'content', 'products')
    const guides_dir = join(root, 'content', 'guides')
    const public_dir = join(root, 'public')
    await mkdir(join(products_dir, 'images'), { recursive: true })
    await mkdir(join(guides_dir, 'images'), { recursive: true })

    writeJson(join(guides_dir, 'broken-guide.json'), {
      status: 'published',
      image_file: 'broken-guide.jpg',
      image_url: null,
    })
    writeFileSync(join(guides_dir, 'images', 'broken-guide.jpg'), Buffer.from('not an image'))

    await expect(buildContentImages({ products_dir, guides_dir, public_dir })).rejects.toThrow(/Failed: 1/)
    expect(existsSync(join(public_dir, 'images', 'guides', 'broken-guide.webp'))).toBe(false)
  })

  it('should reject same-domain output collisions before optimizing images', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dwselect-build-content-images-collision-'))
    temp_roots.push(root)
    const products_dir = join(root, 'content', 'products')
    const guides_dir = join(root, 'content', 'guides')
    const public_dir = join(root, 'public')
    await mkdir(join(products_dir, 'images'), { recursive: true })
    await mkdir(join(guides_dir, 'images'), { recursive: true })

    writeJson(join(products_dir, 'camera-jpg.json'), {
      status: 'published',
      image_file: 'camera.jpg',
      image_url: null,
    })
    writeJson(join(products_dir, 'camera-png.json'), {
      status: 'published',
      image_file: 'camera.png',
      image_url: null,
    })
    writeFileSync(join(products_dir, 'images', 'camera.jpg'), createSvgImage(800, 400))
    writeFileSync(join(products_dir, 'images', 'camera.png'), createSvgImage(800, 400))

    await expect(buildContentImages({ products_dir, guides_dir, public_dir })).rejects.toThrow(/output collision.*products\/camera-jpg\.json.*camera\.jpg.*products\/camera-png\.json.*camera\.png/s)
    expect(existsSync(join(public_dir, 'images', 'products', 'camera.webp'))).toBe(false)
  })
})

function writeJson(path: string, value: Record<string, unknown>) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function createSvgImage(width: number, height: number) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f97316"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#0f172a"/></svg>`)
}

async function readWebpDimensions(path: string): Promise<WebpDimensions> {
  const buffer = await readFile(path)

  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`Not a WebP file: ${path}`)
  }

  let offset = 12

  while (offset + 8 <= buffer.length) {
    const chunk_type = buffer.toString('ascii', offset, offset + 4)
    const chunk_size = buffer.readUInt32LE(offset + 4)
    const chunk_offset = offset + 8

    if (chunk_type === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(chunk_offset + 6) & 0x3fff,
        height: buffer.readUInt16LE(chunk_offset + 8) & 0x3fff,
      }
    }

    if (chunk_type === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(chunk_offset + 4, 3),
        height: 1 + buffer.readUIntLE(chunk_offset + 7, 3),
      }
    }

    offset = chunk_offset + chunk_size + (chunk_size % 2)
  }

  throw new Error(`Unsupported WebP container: ${path}`)
}
