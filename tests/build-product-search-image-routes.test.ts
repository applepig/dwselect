import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { buildProductSearchImageRoutes } from '../scripts/build-product-search-image-routes'

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function makeProductsDir(files: Record<string, { status: string, image_file: string }>) {
  const dir = mkdtempSync(join(tmpdir(), 'product-search-images-'))
  dirs.push(dir)
  for (const [file_name, payload] of Object.entries(files)) {
    writeFileSync(join(dir, file_name), JSON.stringify({ id: file_name.replace(/\.json$/, ''), ...payload }))
  }
  return dir
}

// 搜尋結果商品列只在 client render，其 <NuxtImg format="webp"> 的 IPX URL 不在任何 prerender HTML 裡，須顯式 prerender。
describe('buildProductSearchImageRoutes', () => {
  it('should build the IPX webp route that search result rows request for each published product image', () => {
    const dir = makeProductsDir({
      'a.json': { status: 'published', image_file: 'a.png' },
      'b.json': { status: 'published', image_file: 'b.jpg' },
    })

    expect(buildProductSearchImageRoutes(dir).toSorted()).toEqual([
      '/_ipx/f_webp/products/images/a.png',
      '/_ipx/f_webp/products/images/b.jpg',
    ])
  })

  // schema 允許檔名含 `%` 與空白；Nitro prerender 會 decodeURI(route)，未編碼的 `%` 會讓 generate 拋 URIError。
  // 編碼須與 <NuxtImg>（ipxStatic provider 的 ufo encodePath）實際請求的 URL 一致，否則 prerender 檔與請求對不上。
  it.each([
    ['100%-cotton.png', '/_ipx/f_webp/products/images/100%25-cotton.png'],
    ['rice cooker.jpg', '/_ipx/f_webp/products/images/rice%20cooker.jpg'],
  ])('should encode the image file name %s the same way NuxtImg requests it', (image_file, route) => {
    const dir = makeProductsDir({ 'a.json': { status: 'published', image_file } })

    expect(buildProductSearchImageRoutes(dir)).toEqual([route])
  })

  it('should skip products that are not published', () => {
    const dir = makeProductsDir({
      'live.json': { status: 'published', image_file: 'live.png' },
      'draft.json': { status: 'draft', image_file: 'draft.png' },
    })

    expect(buildProductSearchImageRoutes(dir)).toEqual(['/_ipx/f_webp/products/images/live.png'])
  })
})
