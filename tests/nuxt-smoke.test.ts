import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from 'nuxt'

import nuxt_config from '../nuxt.config'
import package_json from '../package.json'
import { resolveImageFileUrl } from '../app/utils/content-images/resolve-image-file-url'

describe('Nuxt SSG baseline', () => {
  it('should enable Nuxt UI and static generation without Nuxt Content', () => {
    expect(nuxt_config.modules).not.toContain('@nuxt/content')
    expect(nuxt_config.modules).toContain('@nuxt/ui')
    expect(nuxt_config.modules).toContain('@nuxt/image')
    expect(nuxt_config.image?.dir).toBe('../content')
    expect(nuxt_config.ui?.fonts).toBe(false)
    expect(nuxt_config.nitro?.preset).toBe('static')
    // M3 spike：暫時重啟，等待使用者實機 iPad Safari 驗證；未 PASS 前不得 ship true。
    expect(nuxt_config.experimental?.viewTransition).toBe(true)
    expect(nuxt_config.app?.pageTransition).toMatchObject({
      name: 'compact-page-fade',
      mode: 'out-in',
      duration: 320,
    })
  })

  it('should generate static output from prerendered server routes without legacy artifact builds', () => {
    expect(package_json.scripts.generate).toBe('./dev.sh generate')
    expect(package_json.scripts.build).toBe('pnpm build:public-discovery && node scripts/assert-content-images.ts && nuxt build')
  })

  it('should fail static generation when any prerendered route errors (spec Case 1)', () => {
    expect(nuxt_config.nitro?.prerender?.failOnError).toBe(true)
  })

  it('should keep content image optimization out of the generate prerequisite chain (Nuxt Image owns it)', () => {
    expect(package_json.scripts).toHaveProperty('build:content-images')
    expect(package_json.scripts.build).not.toContain('build:content-images')
    expect(package_json.devDependencies).toHaveProperty('@nuxt/image')
  })

  it('should avoid publishing raw content image directories through Nitro publicAssets', () => {
    const public_assets = nuxt_config.nitro?.publicAssets ?? []

    expect(JSON.stringify(public_assets)).not.toContain('content/products/images')
    expect(JSON.stringify(public_assets)).not.toContain('content/guides/images')
  })

  it('should resolve local content image files to Nuxt Image source paths', () => {
    expect(resolveImageFileUrl('sample-product.jpg', 'products')).toBe('/products/images/sample-product.jpg')
    expect(resolveImageFileUrl('sample-guide.png', 'guides')).toBe('/guides/images/sample-guide.png')
    expect(resolveImageFileUrl('already-optimized.webp', 'products')).toBe('/products/images/already-optimized.webp')
    expect(() => resolveImageFileUrl('../unsafe.jpg', 'products')).toThrow('Invalid image_file')
  })

  it('should keep taxonomy JSON data validated and Nuxt Content config absent', () => {
    const category_taxonomy = JSON.parse(readFileSync(
      new URL('../content/taxonomies/categories.json', import.meta.url),
      'utf8',
    )) as { items: Array<{ id: string, label: string }> }
    const channel_taxonomy = JSON.parse(readFileSync(
      new URL('../content/taxonomies/channels.json', import.meta.url),
      'utf8',
    )) as { items: Array<{ id: string, label: string }> }
    const tag_taxonomy = JSON.parse(readFileSync(
      new URL('../content/taxonomies/tags.json', import.meta.url),
      'utf8',
    )) as { items: Array<{ id: string, label: string }> }
    expect(category_taxonomy.items).toContainEqual(expect.objectContaining({ id: 'av-theater', label: '影音劇院' }))
    expect(channel_taxonomy.items).toContainEqual(expect.objectContaining({ id: 'pchome', label: 'PChome' }))
    expect(tag_taxonomy.items.length).toBeGreaterThan(0)

    const content_config_path = new URL('../content.config.ts', import.meta.url)

    expect(existsSync(content_config_path)).toBe(false)
  })

  it('should remove direct Nuxt Content and SQLite package dependencies', () => {
    expect(package_json.dependencies).not.toHaveProperty('@nuxt/content')
    expect(package_json.dependencies).not.toHaveProperty('better-sqlite3')
    expect(package_json.pnpm.onlyBuiltDependencies).not.toContain('better-sqlite3')
  })

  it('should keep the Git-backed content reader as the content source guard', () => {
    const query_helper_path = new URL('../app/utils/get-published-products-query.ts', import.meta.url)
    const content_reader_path = new URL('../scripts/content-reader.ts', import.meta.url)

    expect(existsSync(query_helper_path)).toBe(false)
    expect(existsSync(content_reader_path)).toBe(true)
  })

  it('should keep responsive catalog layout CSS class hooks defined', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('.compact-app-shell')
    expect(catalog_css).toContain('.product-card')
    expect(catalog_css).toContain('.app-nav-button:focus-visible')
    expect(catalog_css).toContain('.category-chip:focus-visible')
    expect(catalog_css).toContain('.tag-chip:focus-visible')
  })

  it('should keep breadcrumb link and home-results transition CSS class hooks defined', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('.breadcrumb-link')
    expect(catalog_css).toContain('.breadcrumb-link:focus-visible')
    expect(catalog_css).toContain('.home-results-enter-active')
    expect(catalog_css).toContain('.home-results-leave-active')
    expect(catalog_css).toContain('.home-results-enter-from')
  })

  it('should keep desktop product category navigation CSS class hooks defined', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('.desktop-category-items')
    expect(catalog_css).toContain('.desktop-category-link')
    expect(catalog_css).toContain('.compact-app-bottom-tabs .app-nav-button')
    expect(catalog_css).toContain('.compact-app-rail .app-nav-button')
  })

  it('should keep product detail page and buy CTA CSS class hooks defined', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('.product-detail-page')
    expect(catalog_css).toContain('.detail-buy-cta')
  })

  it('should keep detail taxonomy chip CSS class hooks defined and DW copy WCAG readable', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('.detail-taxonomy-row')
    expect(catalog_css).toContain('.catalog-pill')
    expect(catalog_css).toContain('.catalog-pill--default')
    expect(catalog_css).toContain('.detail-dw-says')
    expect(getContrastRatio('#201c17', '#fff4dd')).toBeGreaterThanOrEqual(4.5)
  })

  it('should keep Nuxt head runtime on Unhead v2 for Nuxt UI color injection', () => {
    const nuxt_package = JSON.parse(readFileSync(
      new URL('../node_modules/nuxt/package.json', import.meta.url),
      'utf8',
    )) as { dependencies?: Record<string, string> }
    const unhead_range = nuxt_package.dependencies?.unhead ?? ''

    expect(unhead_range).toMatch(/^\^?2\./)
  })

  it('should define routed page files and prerender every product detail route', () => {
    const page_files = [
      '../app/pages/index.vue',
      '../app/pages/guide/index.vue',
      '../app/pages/guide/[id].vue',
      '../app/pages/search.vue',
      '../app/pages/links.vue',
      '../app/pages/products/[id].vue',
    ]
    const product_route_count = countPublishedContent('../content/products/')
    const guide_route_count = countPublishedContent('../content/guides/')
    const first_published_product_id = firstPublishedId('../content/products/')
    const first_published_guide_id = firstPublishedId('../content/guides/')
    const prerender_routes = nuxt_config.nitro?.prerender?.routes ?? []

    for (const file_path of page_files) {
      expect(readFileSync(new URL(file_path, import.meta.url), 'utf8')).toBeTruthy()
    }

    expect(prerender_routes).toContain('/')
    expect(prerender_routes).toContain('/guide')
    expect(prerender_routes).toContain('/search')
    expect(prerender_routes).toContain('/links')
    expect(prerender_routes).toContain('/api/content.json')
    expect(prerender_routes).toContain('/search-index.json')
    expect(prerender_routes.filter((route) => route.startsWith('/products/') && !route.startsWith('/api/'))).toHaveLength(product_route_count)
    // /guide 列表本身也以 /guide/ 開頭，故扣掉它才是 detail route 數，須等於 published guide 數（AC13）。
    expect(prerender_routes.filter((route) => route.startsWith('/guide/') && !route.startsWith('/api/'))).toHaveLength(guide_route_count)
    // 028 拆分：每筆 published 商品／指南都要 prerender 出 per-id detail JSON，數量與 detail 頁 route 一致，
    // 否則 generate 會漏產 detail JSON 讓詳情頁載入失敗（failOnError 把缺漏放大為 build 中止）。
    expect(prerender_routes.filter((route) => route.startsWith('/api/products/'))).toHaveLength(product_route_count)
    expect(prerender_routes.filter((route) => route.startsWith('/api/guides/'))).toHaveLength(guide_route_count)
    expect(prerender_routes).toContain(`/api/products/${first_published_product_id}.json`)
    expect(prerender_routes).toContain(`/api/guides/${first_published_guide_id}.json`)
  })

  it('should resolve NuxtLink prefetch to interaction-only so the home page does not background prefetch every link (ADR-3)', async () => {
    expect(nuxt_config.experimental?.defaults?.nuxtLink?.prefetchOn).toEqual({
      interaction: true,
      visibility: false,
    })

    const nuxt = await loadNuxt({
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      dev: false,
      ready: false,
    })

    try {
      expect(nuxt.options.experimental.defaults.nuxtLink.prefetchOn).toEqual({
        interaction: true,
        visibility: false,
      })
    }
    finally {
      await nuxt.close()
    }
  })

  it('should define light and dark handoff CSS tokens', () => {
    const variable_css = readFileSync(new URL('../app/assets/styles/variables.css', import.meta.url), 'utf8')

    expect(variable_css).toContain('--dw-bg')
    expect(variable_css).toContain('--dw-panel')
    expect(variable_css).toContain('--dw-accent')
    expect(variable_css).toContain('--dw-teal')
    expect(variable_css).toContain('--dw-rose')
    expect(variable_css).toContain('--dw-amber')
    expect(variable_css).toContain('.dark')
    expect(variable_css).toContain('--ui-bg')
    expect(variable_css).toContain('--ui-text')
  })
})

function countPublishedContent(relative_dir: string): number {
  return readdirSync(new URL(relative_dir, import.meta.url))
    .filter((file_name) => file_name.endsWith('.json'))
    .map((file_name) => JSON.parse(readFileSync(new URL(`${relative_dir}${file_name}`, import.meta.url), 'utf8')))
    .filter((content) => content.status === 'published')
    .length
}

function firstPublishedId(relative_dir: string): string {
  const file_name = readdirSync(new URL(relative_dir, import.meta.url))
    .filter((name) => name.endsWith('.json'))
    .toSorted((left, right) => left.localeCompare(right))
    .find((name) => JSON.parse(readFileSync(new URL(`${relative_dir}${name}`, import.meta.url), 'utf8')).status === 'published')

  if (file_name === undefined) {
    throw new Error(`No published content in ${relative_dir}`)
  }

  return file_name.replace(/\.json$/, '')
}

function getContrastRatio(foreground_hex: string, background_hex: string) {
  const foreground = getRelativeLuminance(getRgb(foreground_hex))
  const background = getRelativeLuminance(getRgb(background_hex))

  return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
}

function getRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)

  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  return [Number.parseInt(match[1]!, 16), Number.parseInt(match[2]!, 16), Number.parseInt(match[3]!, 16)]
}

function getRelativeLuminance([red, green, blue]: [number, number, number]) {
  const [linear_red, linear_green, linear_blue] = [red, green, blue].map((channel) => {
    const normalized_channel = channel / 255

    if (normalized_channel <= 0.03928) {
      return normalized_channel / 12.92
    }

    return ((normalized_channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * linear_red! + 0.7152 * linear_green! + 0.0722 * linear_blue!
}
