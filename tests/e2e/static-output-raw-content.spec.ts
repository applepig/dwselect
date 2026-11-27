import { readdirSync } from 'node:fs'

import { expect, test } from '@playwright/test'

// @nuxt/image 2 會把 image.dir（content/）整個推進 Nitro publicAssets，generate 時原始 content JSON（含 draft）、
// taxonomy 與 content/AGENTS.md 全被複製進公開產物。公開站只能經 /api、/_ipx 等產物取得內容。
const first_product_file = readdirSync(new URL('../../content/products/', import.meta.url))
  .find((file_name) => file_name.endsWith('.json'))

test('raw content source files are not served by the static site', async ({ request }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'HTTP-only check, viewport-independent')

  for (const path of ['/AGENTS.md', '/taxonomies/categories.json', `/products/${first_product_file}`]) {
    const response = await request.get(path, { maxRedirects: 0 })

    expect(response.status(), path).toBe(404)
  }
})
