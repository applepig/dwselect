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
    expect(nuxt_config.experimental?.viewTransition).toBe(false)
    expect(nuxt_config.app?.pageTransition).toMatchObject({
      name: 'compact-page-fade',
      mode: 'out-in',
      duration: 320,
    })
  })

  it('should build the search index before static generation', () => {
    expect(package_json.scripts.generate).toContain('pnpm build:search-index')
  })

  it('should expose taxonomy JSON data collections and content domain collections', () => {
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
    const link_files = readdirSync(new URL('../content/links/', import.meta.url)).filter((file_name) => file_name.endsWith('.json'))
    const guide_files = readdirSync(new URL('../content/guides/', import.meta.url)).filter((file_name) => file_name.endsWith('.json'))

    expect(category_taxonomy.items).toContainEqual(expect.objectContaining({ id: 'av-theater', label: '影音劇院' }))
    expect(channel_taxonomy.items).toContainEqual(expect.objectContaining({ id: 'pchome', label: 'PChome' }))
    expect(tag_taxonomy.items.length).toBeGreaterThan(0)
    expect(link_files).toEqual(expect.arrayContaining(['applepig-home.json', '2026-06-02-b18.json']))
    expect(guide_files).toEqual(expect.arrayContaining(['2026-06-02-日本米入門篇.json', '2026-06-02-aeron-chair.json']))

    const content_config_source = readFileSync(new URL('../content.config.ts', import.meta.url), 'utf8')
    expect(content_config_source).toContain('guides: defineCollection')
    expect(content_config_source).toContain("source: 'guides/*.json'")
    expect(content_config_source).toContain('links: defineCollection')
    expect(content_config_source).toContain("source: 'links/*.json'")
    expect(content_config_source).toContain('categories: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/categories.json'")
    expect(content_config_source).toContain('channels: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/channels.json'")
    expect(content_config_source).toContain('tags: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/tags.json'")
    expect(content_config_source).toContain('brands: defineCollection')
    expect(content_config_source).toContain("source: 'taxonomies/brands.json'")
    expect(content_config_source).not.toContain("source: 'taxonomies/links.json'")
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

  it('should wire the public search input with submitted query search state', () => {
    const page_source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')
    const input_source = readFileSync(new URL('../app/components/search/search-input.vue', import.meta.url), 'utf8')
    const composable_source = readFileSync(new URL('../app/composables/use-search-page.ts', import.meta.url), 'utf8')

    expect(page_source).toContain('v-model:query="pending_search_query"')
    expect(page_source).toContain('client_search_results')
    expect(page_source).toContain('search_result_sections')
    expect(page_source).toContain('router.push')
    expect(input_source).toContain('<input')
    expect(input_source).toContain('@keydown.enter="submitPendingSearchFromEvent"')
    expect(input_source).toContain('event.isComposing')
    expect(input_source).toContain('event.preventDefault()')
    expect(input_source).toContain('placeholder="在找什麼嗎？™"')
    expect(composable_source).toContain('getClientSearchResults')
    expect(composable_source).toContain('getClientSearchSuggestions')
    expect(page_source).not.toContain('<UInputMenu')
  })

  it('should load runtime taxonomies, guides and links from Nuxt Content in the compact app source', () => {
    const composable_source = readFileSync(new URL('../app/composables/use-catalog-data.ts', import.meta.url), 'utf8')
    const home_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')

    expect(composable_source).toContain("queryCollection('products')")
    expect(composable_source).toContain("queryCollection('guides')")
    expect(composable_source).toContain("queryCollection('categories')")
    expect(composable_source).toContain("queryCollection('channels')")
    expect(composable_source).toContain("queryCollection('tags')")
    expect(composable_source).toContain("queryCollection('links')")
    expect(composable_source).toContain('runtime_taxonomies')
    expect(composable_source).toContain('runtime_guides')
    expect(composable_source).toContain('runtime_links')
    expect(home_source).toContain('useCatalogData')
    expect(home_source).toContain('getCompactAppView(')
    expect(home_source).toContain('all_products.value')
    expect(home_source).toContain('runtime_taxonomies.value')
    expect(home_source).toContain('runtime_guides.value')
    expect(home_source).toContain('runtime_links.value')
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
      '../app/pages/links.vue',
      '../app/components/search/search-idle-panel.vue',
    ].map((file_path) => readFileSync(new URL(file_path, import.meta.url), 'utf8')).join('\n')

    expect(page_source).toContain('目前沒有已上架商品')
    expect(page_source).toContain('目前沒有已發布指南')
    expect(page_source).toContain('目前沒有已發布連結')
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
    expect(catalog_css).toContain('.compact-main {\n  width: 100%;\n  min-width: 0;\n  padding: 0 0 92px;')
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
    expect(page_sources).not.toContain('<TagExplorer')
    expect(page_sources).toContain('<LinkPanel')

    for (const file_path of component_files) {
      expect(readFileSync(new URL(file_path, import.meta.url), 'utf8')).toBeTruthy()
    }
  })

  it('should expose routed compact tabs, theme toggle and external link row in source', () => {
    const nav_source = readFileSync(new URL('../app/components/app-navigation.vue', import.meta.url), 'utf8')
    const theme_source = readFileSync(new URL('../app/components/theme-toggle.vue', import.meta.url), 'utf8')
    const link_source = readFileSync(new URL('../app/components/link-panel.vue', import.meta.url), 'utf8')
    const link_rows_source = readFileSync(new URL('../app/utils/published-products/resource-rows.ts', import.meta.url), 'utf8')

    expect(nav_source).toContain('<NuxtLink')
    expect(nav_source).toContain("to: '/'")
    expect(nav_source).toContain("to: '/guide'")
    expect(nav_source).toContain("to: '/links'")
    expect(nav_source).toContain("to: '/search'")
    expect(nav_source.indexOf("id: 'links'")).toBeLessThan(nav_source.indexOf("id: 'search'"))
    expect(nav_source).not.toContain('selectTab')
    expect(nav_source).toContain('compact-app-bottom-tabs')
    expect(nav_source).toContain('compact-app-rail')
    expect(nav_source).toContain('compact-app-sidebar')
    expect(nav_source).toContain('desktop_category_items')
    expect(nav_source).toContain('desktop-route-items')
    expect(nav_source).toContain('isCategoryActive')
    expect(nav_source).toContain('aria-current')
    expect(nav_source).toContain('app-nav-button')
    expect(theme_source).toContain('<UColorModeButton')
    expect(link_source).toContain('<ResourceList')
    expect(link_rows_source).toContain('getPublishedLinks')
    expect(link_rows_source).toContain('getResourceRowLinkAttributes')
    expect(link_rows_source).toContain("target: '_blank'")
    expect(link_rows_source).toContain("rel: 'noopener noreferrer'")
  })

  it('should expose desktop product category navigation without adding it to mobile or tablet nav', () => {
    const nav_source = readFileSync(new URL('../app/components/app-navigation.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(nav_source).toContain('desktop-category-items')
    expect(nav_source).toContain('desktop-category-link')
    expect(nav_source).toContain('category.id === \'all\' ? \'/\' : `/?category=${category.id}`')
    expect(nav_source).toContain('runtime_taxonomies')
    expect(catalog_css).toContain('.desktop-category-items')
    expect(catalog_css).toContain('.desktop-category-link')
    expect(catalog_css).toContain('.compact-app-bottom-tabs .app-nav-button')
    expect(catalog_css).toContain('.compact-app-rail .app-nav-button')
  })

  it('should render guide, link and mixed search results with external safety attributes in source', () => {
    const guide_source = readFileSync(new URL('../app/pages/guide.vue', import.meta.url), 'utf8')
    const links_source = readFileSync(new URL('../app/pages/links.vue', import.meta.url), 'utf8')
    const search_source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')
    const resource_rows_source = readFileSync(new URL('../app/utils/published-products/resource-rows.ts', import.meta.url), 'utf8')

    expect(guide_source).toContain('compact_view.guide.guides')
    expect(guide_source).not.toContain('<TagExplorer')
    expect(guide_source).not.toContain('query: tags.length')
    expect(guide_source).toContain('<ResourceList')
    expect(links_source).toContain('<LinkPanel')
    expect(links_source).toContain('compact_view.links.length')
    expect(search_source).toContain('client_search_results')
    expect(search_source).toContain('getSearchResultSections')
    expect(search_source).toContain('search-result-section')
    expect(search_source).toContain('<ResourceList')
    expect(resource_rows_source).toContain('getSearchSuggestionMeta')
    expect(resource_rows_source).toContain('result.price_text')
    expect(resource_rows_source).toContain('result.channel_label')
    expect(resource_rows_source).toContain("target: result.external ? '_blank' : null")
    expect(resource_rows_source).toContain("rel: result.external ? 'noopener noreferrer' : null")
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
    expect(prerender_routes).toContain('/products/2026-06-02-sharp-65-inch-xled')
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
    const search_index_payload = JSON.parse(search_index_source) as {
      documents: Array<{
        document_id: string
        type: string
        title: string
        category_labels?: string[]
        channel_label?: string
      }>
    }

    expect(product_file_names).toHaveLength(62)
    expect(product_file_names).not.toContain('2026-06-02-sample-product.json')
    expect(product_sources.join('\n')).toContain('Sharp 65吋 XLED')
    expect(product_sources.join('\n')).toContain('"category_id": "av-theater"')
    expect(product_sources.join('\n')).not.toContain('"category":')
    expect(search_index_payload.documents).toHaveLength(67)
    expect(search_index_payload.documents).toContainEqual(expect.objectContaining({
      document_id: 'product:2026-06-02-sharp-65-inch-xled',
      type: 'product',
      title: 'Sharp 65吋 XLED',
      category_labels: ['影音劇院'],
      channel_label: expect.any(String),
    }))
    expect(search_index_payload.documents).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'guide:2026-06-02-日本米入門篇', type: 'guide' }),
      expect.objectContaining({ document_id: 'link:2026-06-02-b18', type: 'link' }),
      expect.objectContaining({ document_id: 'link:applepig-home', type: 'link' }),
    ]))
    expect(search_index_source).toContain('"category_labels"')
    expect(search_index_source).toContain('"channel_label":')
    expect(search_index_source).not.toContain('"category": "')
    expect(search_index_source).not.toContain('2026-06-02-sample-product')
  })
})
