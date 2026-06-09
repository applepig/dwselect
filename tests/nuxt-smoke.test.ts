import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

import nuxt_config from '../nuxt.config'
import package_json from '../package.json'
import { getPublishedProductsQuery } from '../app/utils/get-published-products-query'

describe('Nuxt SSG baseline', () => {
  it('should enable Nuxt Content, Nuxt UI and static generation baseline', () => {
    expect(nuxt_config.modules).toContain('@nuxt/content')
    expect(nuxt_config.modules).toContain('@nuxt/ui')
    expect(nuxt_config.nitro?.preset).toBe('static')
    expect(nuxt_config.experimental?.viewTransition).toBe(true)
  })

  it('should build the search index before static generation', () => {
    expect(package_json.scripts.generate).toContain('pnpm build:search-index')
  })

  it('should expose taxonomy JSON data collections as object payloads', () => {
    const category_taxonomy = JSON.parse(readFileSync(
      new URL('../content/taxonomies/categories.json', import.meta.url),
      'utf8',
    )) as { items: Array<{ id: string, label: string }> }
    const channel_taxonomy = JSON.parse(readFileSync(
      new URL('../content/taxonomies/channels.json', import.meta.url),
      'utf8',
    )) as { items: Array<{ id: string, label: string }> }
    const link_taxonomy = JSON.parse(readFileSync(
      new URL('../content/taxonomies/links.json', import.meta.url),
      'utf8',
    )) as { items: Array<{ id: string, url: string }> }

    expect(category_taxonomy.items).toContainEqual(expect.objectContaining({ id: 'av', label: '影音' }))
    expect(channel_taxonomy.items).toContainEqual(expect.objectContaining({ id: 'pchome', label: 'PChome' }))
    expect(link_taxonomy.items).toEqual([
      expect.objectContaining({ id: 'applepig-home', url: 'https://applepig.idv.tw' }),
    ])

    const content_config_source = readFileSync(new URL('../content.config.ts', import.meta.url), 'utf8')
    expect(content_config_source).toContain('categories: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/categories.json'")
    expect(content_config_source).toContain('channels: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/channels.json'")
    expect(content_config_source).toContain('links: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/links.json'")
  })

  it('should expose a published products query helper skeleton', () => {
    expect(getPublishedProductsQuery()).toEqual({
      collection: 'products',
      where: {
        status: 'published',
      },
      sort: [
        { category_id: 'ASC' },
        { published_at: 'DESC' },
        { name: 'ASC' },
      ],
    })
  })

  it('should wire the public search input to Nuxt UI with external filtering', () => {
    const page_source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')

    expect(page_source).toContain('<UInput')
    expect(page_source).toContain('v-model="pending_search_query"')
    expect(page_source).toContain('placeholder="在找什麼嗎？™"')
    expect(page_source).toContain('getClientSearchResults')
    expect(page_source).toContain('client_search_result_ids')
    expect(page_source).toContain('search_result_ids: client_search_result_ids.value')
    expect(page_source).toContain('router.replace')
    expect(page_source).not.toContain('<UInputMenu')
  })

  it('should load runtime taxonomies and links from Nuxt Content in the compact app source', () => {
    const composable_source = readFileSync(new URL('../app/composables/use-catalog-data.ts', import.meta.url), 'utf8')
    const home_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')

    expect(composable_source).toContain("queryCollection('products')")
    expect(composable_source).toContain("queryCollection('categories')")
    expect(composable_source).toContain("queryCollection('channels')")
    expect(composable_source).toContain("queryCollection('links')")
    expect(composable_source).toContain('runtime_taxonomies')
    expect(composable_source).toContain('runtime_links')
    expect(home_source).toContain('useCatalogData')
    expect(home_source).toContain('getCompactAppView(all_products.value')
    expect(home_source).toContain('runtime_taxonomies.value')
  })

  it('should lazy fetch the static search index from a client helper', () => {
    const helper_source = readFileSync(
      new URL('../app/utils/search/client-search.ts', import.meta.url),
      'utf8',
    )

    expect(helper_source).toContain("fetch('/search-index.json')")
    expect(helper_source).not.toContain('import search-index')
    expect(helper_source).not.toContain("from '../../../public/search-index.json'")
  })

  it('should expose compact app empty states in the public source', () => {
    const page_source = [
      '../app/pages/index.vue',
      '../app/pages/guide.vue',
      '../app/pages/search.vue',
    ].map((file_path) => readFileSync(new URL(file_path, import.meta.url), 'utf8')).join('\n')

    expect(page_source).toContain('目前沒有已上架商品')
    expect(page_source).toContain('這組 tag 暫時沒東西')
    expect(page_source).toContain('熱門 tag')
    expect(page_source).toContain('沒這個坑，去許願吧')
  })

  it('should keep catalog controls and long product text responsive across phone, tablet and desktop widths', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('@media (max-width: 767px)')
    expect(catalog_css).toContain('@media (min-width: 768px) and (max-width: 1199px)')
    expect(catalog_css).toContain('@media (min-width: 1200px)')
    expect(catalog_css).toContain('--nav-rail-width: 96px')
    expect(catalog_css).toContain('--nav-sidebar-width: 232px')
    expect(catalog_css).toContain('.compact-app-shell')
    expect(catalog_css).toContain('.product-card')
    expect(catalog_css).toContain('min-width: 0')
    expect(catalog_css).toContain('overflow-wrap: anywhere')
    expect(catalog_css).toContain('word-break: break-word')
    expect(catalog_css).toContain('text-overflow: ellipsis')
    expect(catalog_css).toContain('min-height: 44px')
    expect(catalog_css).toContain('.app-nav-button:focus-visible')
    expect(catalog_css).toContain('.category-chip:focus-visible')
    expect(catalog_css).toContain('.tag-chip:focus-visible')
  })

  it('should use Nuxt UI surfaces for compact cards and keep desktop content full width', () => {
    const card_source = readFileSync(new URL('../app/components/product-card.vue', import.meta.url), 'utf8')
    const detail_source = readFileSync(new URL('../app/components/product-detail.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(card_source).toContain('<UCard')
    expect(card_source).toContain('<UBadge')
    expect(card_source).toContain('product-image-overlay')
    expect(card_source).toContain('product-card-price')
    expect(detail_source).toContain('<UBadge')
    expect(detail_source).toContain('<UButton')
    expect(catalog_css).toContain('.compact-main {\n  min-width: 0;\n  padding: 0 0 92px;')
    expect(catalog_css).toContain('.compact-top-bar {\n  position: sticky;')
    expect(catalog_css).toContain('padding: 18px 16px 14px;')
    expect(catalog_css).toContain('grid-template-columns: repeat(auto-fit, minmax(clamp(280px, 10vw, 400px), 1fr));')
    expect(catalog_css).not.toContain('width: min(100%, 1180px);')
  })

  it('should wrap Nuxt with UApp for Nuxt UI providers', () => {
    const app_source = readFileSync(new URL('../app/app.vue', import.meta.url), 'utf8')

    expect(app_source).toContain('<UApp>')
    expect(app_source).toContain('<NuxtPage />')
  })

  it('should split compact app shell into navigation, theme, card, tag and link components', () => {
    const layout_source = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
    const page_sources = [
      '../app/pages/index.vue',
      '../app/pages/guide.vue',
      '../app/pages/search.vue',
      '../app/pages/links.vue',
      '../app/pages/products/[id].vue',
    ].map((file_path) => readFileSync(new URL(file_path, import.meta.url), 'utf8')).join('\n')
    const component_files = [
      '../app/components/app-navigation.vue',
      '../app/components/theme-toggle.vue',
      '../app/components/product-card.vue',
      '../app/components/product-detail.vue',
      '../app/components/tag-explorer.vue',
      '../app/components/link-panel.vue',
    ]

    expect(layout_source).toContain('<AppNavigation')
    expect(layout_source).toContain('<ThemeToggle')
    expect(layout_source).toContain('<slot />')
    expect(page_sources).toContain('<ProductCard')
    expect(page_sources).toContain('<ProductDetail')
    expect(page_sources).toContain('<TagExplorer')
    expect(page_sources).toContain('<LinkPanel')

    for (const file_path of component_files) {
      expect(readFileSync(new URL(file_path, import.meta.url), 'utf8')).toBeTruthy()
    }
  })

  it('should expose routed compact tabs, theme toggle and external link row in source', () => {
    const nav_source = readFileSync(new URL('../app/components/app-navigation.vue', import.meta.url), 'utf8')
    const theme_source = readFileSync(new URL('../app/components/theme-toggle.vue', import.meta.url), 'utf8')
    const link_source = readFileSync(new URL('../app/components/link-panel.vue', import.meta.url), 'utf8')
    const view_model_source = readFileSync(new URL('../app/utils/published-products.ts', import.meta.url), 'utf8')

    expect(nav_source).toContain('<NuxtLink')
    expect(nav_source).toContain("to: '/'")
    expect(nav_source).toContain("to: '/guide'")
    expect(nav_source).toContain("to: '/search'")
    expect(nav_source).toContain("to: '/links'")
    expect(nav_source).not.toContain('selectTab')
    expect(nav_source).toContain('compact-app-bottom-tabs')
    expect(nav_source).toContain('compact-app-rail')
    expect(nav_source).toContain('compact-app-sidebar')
    expect(nav_source).toContain('app-nav-button')
    expect(theme_source).toContain('<UColorModeButton')
    expect(link_source).toContain('target="_blank"')
    expect(link_source).toContain('rel="noopener noreferrer"')
    expect(view_model_source).toContain('https://applepig.idv.tw')
  })

  it('should wire product detail route, buy CTA and view transition contracts in source', () => {
    const detail_page_source = readFileSync(new URL('../app/pages/products/[id].vue', import.meta.url), 'utf8')
    const card_source = readFileSync(new URL('../app/components/product-card.vue', import.meta.url), 'utf8')
    const detail_source = readFileSync(new URL('../app/components/product-detail.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(detail_page_source).toContain('getProductDetail')
    expect(detail_page_source).toContain('createError')
    expect(detail_page_source).toContain('statusCode: 404')
    expect(detail_page_source).toContain('<ProductDetail')
    expect(card_source).toContain('查看')
    expect(card_source).toContain('詳情')
    expect(card_source).toContain('<NuxtLink')
    expect(card_source).toContain('`/products/${product.id}`')
    expect(card_source).toContain('view-transition-name')
    expect(detail_source).not.toContain('<UModal')
    expect(detail_source).toContain('detail-hero-tile')
    expect(detail_source).toContain('view-transition-name')
    expect(detail_source).toContain('DW 怎麼說')
    expect(detail_source).toContain('v-if="detail.description"')
    expect(detail_source).toContain('到 {{ detail.channel_label }} 購買')
    expect(detail_source).toContain('target="_blank"')
    expect(detail_source).toContain('rel="noopener noreferrer"')
    expect(detail_source).toContain('價格與庫存以通路頁面為準。')
    expect(catalog_css).toContain('view-transition-class: product-card')
    expect(catalog_css).toContain('::view-transition-group(.product-card)')
    expect(catalog_css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(catalog_css).toContain('.product-detail-page')
    expect(catalog_css).toContain('.detail-buy-cta')
  })

  it('should register product detail head metadata before async catalog loading', () => {
    const detail_page_source = readFileSync(new URL('../app/pages/products/[id].vue', import.meta.url), 'utf8')
    const use_head_index = detail_page_source.indexOf('useHead(')
    const catalog_await_index = detail_page_source.indexOf('await useCatalogData()')

    expect(use_head_index).toBeGreaterThanOrEqual(0)
    expect(catalog_await_index).toBeGreaterThanOrEqual(0)
    expect(use_head_index).toBeLessThan(catalog_await_index)
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
      '../app/pages/guide.vue',
      '../app/pages/search.vue',
      '../app/pages/links.vue',
      '../app/pages/products/[id].vue',
    ]
    const product_route_count = readdirSync(new URL('../content/products/', import.meta.url))
      .filter((file_name) => file_name.endsWith('.json'))
      .length
    const prerender_routes = nuxt_config.nitro?.prerender?.routes ?? []

    for (const file_path of page_files) {
      expect(readFileSync(new URL(file_path, import.meta.url), 'utf8')).toBeTruthy()
    }

    expect(prerender_routes).toContain('/')
    expect(prerender_routes).toContain('/guide')
    expect(prerender_routes).toContain('/search')
    expect(prerender_routes).toContain('/links')
    expect(prerender_routes.filter((route) => route.startsWith('/products/'))).toHaveLength(product_route_count)
    expect(prerender_routes).toContain('/products/2026-06-02-sharp-65吋-xled')
  })

  it('should define light and dark handoff CSS tokens without a single-hue palette', () => {
    const variable_css = readFileSync(new URL('../app/assets/styles/variables.css', import.meta.url), 'utf8')

    expect(variable_css).toContain('--dw-bg')
    expect(variable_css).toContain('--dw-panel')
    expect(variable_css).toContain('--dw-accent: #ec7a2b')
    expect(variable_css).toContain('--dw-accent: #ff8a3d')
    expect(variable_css).toContain('--dw-teal')
    expect(variable_css).toContain('--dw-rose')
    expect(variable_css).toContain('--dw-amber')
    expect(variable_css).toContain('.dark')
    expect(variable_css).toContain('--ui-bg')
    expect(variable_css).toContain('--ui-text')
  })

  it('should document static search-index generation commands', () => {
    const readme_source = readFileSync(new URL('../README.md', import.meta.url), 'utf8')

    expect(readme_source).toContain('pnpm build:search-index')
    expect(readme_source).toContain('public/search-index.json')
    expect(readme_source).toContain('pnpm generate')
  })

  it('should expose real cutover catalog artifacts and remove the sample product', () => {
    const product_file_names = readdirSync(new URL('../content/products/', import.meta.url))
      .filter((file_name) => file_name.endsWith('.json'))
    const product_sources = product_file_names.map((file_name) => readFileSync(
      new URL(`../content/products/${file_name}`, import.meta.url),
      'utf8',
    ))
    const search_index_source = readFileSync(new URL('../public/search-index.json', import.meta.url), 'utf8')

    expect(product_file_names).toHaveLength(66)
    expect(product_file_names).not.toContain('2026-06-02-sample-product.json')
    expect(product_sources.join('\n')).toContain('Sharp 65吋 XLED')
    expect(product_sources.join('\n')).toContain('"category_id": "av"')
    expect(product_sources.join('\n')).not.toContain('"category":')
    expect(search_index_source).toContain('2026-06-02-sharp-65吋-xled')
    expect(search_index_source).toContain('Sharp 65吋 XLED')
    expect(search_index_source).toContain('"category_label": "影音"')
    expect(search_index_source).toContain('"channel_label":')
    expect(search_index_source).not.toContain('"category": "')
    expect(search_index_source).not.toContain('2026-06-02-sample-product')
  })
})
