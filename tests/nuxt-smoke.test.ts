import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

import nuxt_config from '../nuxt.config'
import package_json from '../package.json'
import { resolveImageFileUrl } from '../app/utils/content-images/resolve-image-file-url'

describe('Nuxt SSG baseline', () => {
  it('should enable Nuxt UI and static generation without Nuxt Content', () => {
    expect(nuxt_config.modules).not.toContain('@nuxt/content')
    expect(nuxt_config.modules).toContain('@nuxt/ui')
    expect(nuxt_config.ui?.fonts).toBe(false)
    expect(nuxt_config.nitro?.preset).toBe('static')
    expect(nuxt_config.experimental?.viewTransition).toBe(false)
    expect(nuxt_config.app?.pageTransition).toMatchObject({
      name: 'compact-page-fade',
      mode: 'out-in',
      duration: 320,
    })
  })

  it('should build the search index before static generation', () => {
    expect(package_json.scripts.generate).toContain('pnpm build:public-artifacts')
    expect(package_json.scripts.generate).not.toContain('pnpm build:search-index && pnpm build:public-discovery')
  })

  it('should build optimized content images before public discovery and static generation', () => {
    expect(package_json.scripts).toHaveProperty('build:content-images')
    expect(package_json.scripts.build).toContain('pnpm build:content-images')
    expect(package_json.scripts.generate).toContain('pnpm build:content-images')
    expect(package_json.scripts.build.indexOf('pnpm build:content-images')).toBeLessThan(package_json.scripts.build.indexOf('pnpm build:public-artifacts'))
    expect(package_json.scripts.generate.indexOf('pnpm build:content-images')).toBeLessThan(package_json.scripts.generate.indexOf('pnpm build:public-artifacts'))
  })

  it('should avoid publishing raw content image directories through Nitro publicAssets', () => {
    const config_source = readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
    const public_assets = nuxt_config.nitro?.publicAssets ?? []

    expect(config_source).not.toContain('content/products/images')
    expect(config_source).not.toContain('content/guides/images')
    expect(JSON.stringify(public_assets)).not.toContain('content/products/images')
    expect(JSON.stringify(public_assets)).not.toContain('content/guides/images')
  })

  it('should resolve local content image files to optimized WebP static asset URLs', () => {
    expect(resolveImageFileUrl('sample-product.jpg', 'products')).toBe('/images/products/sample-product.webp')
    expect(resolveImageFileUrl('sample-guide.png', 'guides')).toBe('/images/guides/sample-guide.webp')
    expect(resolveImageFileUrl('already-optimized.webp', 'products')).toBe('/images/products/already-optimized.webp')
    expect(() => resolveImageFileUrl('../unsafe.jpg', 'products')).toThrow('Invalid image_file')
  })

  it('should keep taxonomy JSON data and content domain files under zod validation', () => {
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

    const content_config_path = new URL('../content.config.ts', import.meta.url)
    const product_schema_test_source = readFileSync(new URL('../tests/product-schema.test.ts', import.meta.url), 'utf8')

    expect(existsSync(content_config_path)).toBe(false)
    expect(product_schema_test_source).toContain('should validate all migrated content domains against schemas and taxonomy references')
    expect(product_schema_test_source).toContain("'../content/products/'")
    expect(product_schema_test_source).toContain("'../content/guides/'")
    expect(product_schema_test_source).toContain("'../content/links/'")
  })

  it('should remove direct Nuxt Content and SQLite package dependencies', () => {
    expect(package_json.dependencies).not.toHaveProperty('@nuxt/content')
    expect(package_json.dependencies).not.toHaveProperty('better-sqlite3')
    expect(package_json.pnpm.onlyBuiltDependencies).not.toContain('better-sqlite3')
  })

  it('should keep runtime and authoring sources free of Nuxt Content query leftovers', () => {
    const source_files = [
      '../nuxt.config.ts',
      '../package.json',
      '../content/AGENTS.md',
      '../docs/CONTENT.md',
      '../AGENTS.md',
      ...readdirSync(new URL('../app/composables/', import.meta.url))
        .filter((file_name) => file_name.endsWith('.ts'))
        .map((file_name) => `../app/composables/${file_name}`),
      ...readdirSync(new URL('../app/pages/', import.meta.url))
        .filter((file_name) => file_name.endsWith('.vue'))
        .map((file_name) => `../app/pages/${file_name}`),
    ]

    const source_text = source_files
      .map((file_path) => readFileSync(new URL(file_path, import.meta.url), 'utf8'))
      .join('\n')

    expect(source_text).not.toContain('queryCollection(')
    expect(source_text).not.toContain('@nuxt/content')
    expect(source_text).not.toContain('content.config.ts')
    expect(source_text).not.toContain('__nuxt_content')
  })

  it('should keep the Git-backed content reader as the content source guard', () => {
    const query_helper_path = new URL('../app/utils/get-published-products-query.ts', import.meta.url)
    const content_reader_path = new URL('../scripts/content-reader.ts', import.meta.url)

    expect(existsSync(query_helper_path)).toBe(false)
    expect(existsSync(content_reader_path)).toBe(true)
    expect(readFileSync(content_reader_path, 'utf8')).toContain('export async function readPublicContentSource')
  })

  it('should wire the public search input with submitted query search state', () => {
    const page_source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')
    const input_source = readFileSync(new URL('../app/components/search/search-input.vue', import.meta.url), 'utf8')
    const composable_source = readFileSync(new URL('../app/composables/use-search-page.ts', import.meta.url), 'utf8')

    expect(page_source).toContain('v-model:query="pending_search_query"')
    expect(page_source).toContain('client_search_results')
    expect(page_source).toContain('search_result_sections')
    expect(page_source).toContain('router.push')
    expect(input_source).toContain('<UInput')
    expect(input_source).toContain('@keydown.enter="submitPendingSearchFromEvent"')
    expect(input_source).toContain('event.isComposing')
    expect(input_source).toContain('event.preventDefault()')
    expect(input_source).toContain('placeholder="在找什麼嗎？™"')
    expect(composable_source).toContain('getClientSearchResults')
    expect(composable_source).toContain('getClientSearchSuggestions')
    expect(page_source).not.toContain('<UInputMenu')
  })

  it('should load runtime catalog from the static public content payload without client-only fetching', () => {
    const composable_source = readFileSync(new URL('../app/composables/use-catalog-data.ts', import.meta.url), 'utf8')
    const fetch_helper_source = readFileSync(new URL('../app/utils/fetch-public-content-payload.ts', import.meta.url), 'utf8')
    const home_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')

    expect(composable_source).toContain("useAsyncData('public-content'")
    expect(composable_source).toContain('fetchPublicContentPayload')
    expect(fetch_helper_source).toContain("$fetch<PublicContentPayload>('/api/content.json')")
    expect(fetch_helper_source).toContain("'public/api/content.json'")
    expect(composable_source).not.toContain('queryCollection(')
    expect(composable_source).not.toContain('server: false')
    expect(fetch_helper_source).not.toContain('server: false')
    expect(composable_source).toContain('content_payload')
    expect(composable_source).toContain('category_ids')
    expect(home_source).toContain('useCatalogData')
    expect(home_source).toContain('getCompactAppView(')
    expect(home_source).toContain('content_payload.value')
    expect(home_source).not.toContain('all_products.value')
    expect(home_source).not.toContain('runtime_taxonomies.value')
  })

  it('should keep product detail and app shell from serializing the full catalog payload', () => {
    const detail_page_source = readFileSync(new URL('../app/pages/products/[id].vue', import.meta.url), 'utf8')
    const detail_composable_source = readFileSync(new URL('../app/composables/use-product-detail-data.ts', import.meta.url), 'utf8')
    const shell_composable_source = readFileSync(new URL('../app/composables/use-catalog-shell-data.ts', import.meta.url), 'utf8')
    const layout_source = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
    const nav_source = readFileSync(new URL('../app/components/app-navigation.vue', import.meta.url), 'utf8')

    expect(detail_page_source).toContain('await useProductDetailData(product_id)')
    expect(detail_page_source).not.toContain('await useCatalogData()')
    expect(detail_page_source).not.toContain('all_products')
    expect(detail_composable_source).toContain("useAsyncData('public-content'")
    expect(detail_composable_source).toContain('details_by_id[product_id]')
    expect(detail_composable_source).toContain('fetchPublicContentPayload')
    expect(detail_composable_source).not.toContain('transform:')
    expect(detail_composable_source).not.toContain('server: false')
    expect(shell_composable_source).toContain("useAsyncData('public-content'")
    expect(shell_composable_source).toContain('desktop_category_items')
    expect(shell_composable_source).toContain('product_breadcrumb_items_by_id')
    expect(shell_composable_source).toContain('fetchPublicContentPayload')
    expect(shell_composable_source).not.toContain('transform:')
    expect(shell_composable_source).not.toContain('server: false')
    expect(layout_source).toContain('<ThemeToggle')
    expect(layout_source).toContain('await useCatalogShellData()')
    expect(layout_source).not.toContain('product-count')
    expect(layout_source).not.toContain('await useCatalogData()')
    expect(nav_source).toContain('await useCatalogShellData()')
    expect(nav_source).not.toContain('await useCatalogData()')
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
    expect(page_source).toContain('熱門標籤')
    expect(page_source).toContain('熱門品牌')
    expect(page_source).toContain('沒這個坑，去許願吧')
  })

  it('should keep search idle pills on the shared chip layout', () => {
    const idle_panel_source = readFileSync(
      new URL('../app/components/search/search-idle-panel.vue', import.meta.url),
      'utf8',
    )
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(idle_panel_source).toContain('class="tag-chip"')
    expect(idle_panel_source).not.toContain('search-history-item')
    expect(catalog_css).toContain('width: fit-content')
    expect(catalog_css).not.toContain('.search-history-item')
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

  it('should use Nuxt UI surfaces for compact cards and keep desktop cards reasonably sized', () => {
    const card_source = readFileSync(new URL('../app/components/product-card.vue', import.meta.url), 'utf8')
    const detail_source = readFileSync(new URL('../app/components/product-detail.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')
    const layout_source = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
    const home_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')

    expect(card_source).toContain('<UCard')
    expect(card_source).toContain('<CatalogPill')
    expect(card_source).not.toContain('<UBadge')
    expect(card_source).toContain("body: 'p-0 sm:p-0'")
    expect(card_source).not.toContain("body: 'p-0' }")
    expect(card_source).toContain('product-card-meta')
    expect(card_source).not.toContain('product-image-overlay')
    expect(card_source).toContain('product-card-price')
    expect(card_source.indexOf('product-card-price')).toBeGreaterThan(card_source.indexOf('product-card-body'))
    expect(card_source.indexOf('channel-badge')).toBeGreaterThan(card_source.indexOf('product-card-body'))
    expect(card_source).toContain(':to="{ path: \'/search\', query: { q: product.channel_label } }"')
    expect(detail_source).toContain('<CatalogPill')
    expect(detail_source).toContain('<UButton')
    expect(catalog_css).toContain('background: var(--dw-bg);')
    expect(catalog_css).not.toContain('linear-gradient(135deg, color-mix(in srgb, var(--dw-amber)')
    expect(catalog_css).toContain('.product-name {\n  -webkit-line-clamp: 1;')
    expect(catalog_css).toContain('.product-summary {\n  -webkit-line-clamp: 3;')
    expect(catalog_css).toContain('block-size: 4.65em;')
    expect(catalog_css).not.toContain('block-size: 3.1em;')
    expect(catalog_css).not.toContain('block-size: 2.7em;')
    expect(catalog_css).toContain('.compact-main {\n  width: 100%;\n  min-width: 0;\n  padding: 0 0 92px;')
    expect(catalog_css).toContain('.compact-top-bar {\n  display: flex;')
    expect(catalog_css).not.toContain('.compact-top-bar {\n  position: sticky;')
    expect(catalog_css).toContain('border: 1px solid var(--dw-border);')
    expect(catalog_css).toContain('box-shadow: var(--dw-shadow);')
    expect(catalog_css).toContain('padding: 12px 16px 8px;')
    expect(catalog_css).toContain('border: 0;')
    expect(catalog_css).toContain('box-shadow: none;')
    expect(catalog_css).toContain('padding: 16px 40px 14px;')
    expect(catalog_css).toContain('padding: 20px 81px 0;')
    expect(catalog_css).toContain('grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));')
    expect(catalog_css).not.toContain('grid-template-columns: repeat(auto-fill, minmax(240px, 320px));')
    expect(catalog_css).not.toContain('justify-content: start;')
    expect(catalog_css).not.toContain('width: min(100%, 1180px);')
    expect(layout_source).not.toContain('product-count')
    expect(layout_source).not.toContain('compact_view.counts.published')
    expect(layout_source).toContain('active_home_category_label')
    expect(layout_source).toContain('DW嚴選')
    expect(layout_source).toContain('breadcrumb-separator')
    expect(home_source).not.toContain('section-heading-row')
    expect(home_source).not.toContain('section-title')
    expect(home_source).not.toContain('<h2')
    expect(home_source).not.toContain('最近值得看')
  })

  it('should expose breadcrumb header links and home category result transition in source', () => {
    const layout_source = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
    const home_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')
    const guide_source = readFileSync(new URL('../app/pages/guide.vue', import.meta.url), 'utf8')
    const links_source = readFileSync(new URL('../app/pages/links.vue', import.meta.url), 'utf8')
    const search_source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(nuxt_config.experimental?.viewTransition).toBe(false)
    expect(layout_source).toContain('<NuxtLink')
    expect(layout_source).toContain('to="/"')
    expect(layout_source).toContain('class="breadcrumb-link"')
    expect(layout_source).toContain('current_breadcrumb_items')
    expect(layout_source).toContain('product_breadcrumb_items_by_id')
    expect(layout_source).toContain("route.path === '/guide'")
    expect(layout_source).toContain("route.path === '/links'")
    expect(layout_source).toContain("route.path === '/search'")
    expect(layout_source).toContain("route.path.startsWith('/products/')")

    expect(guide_source).toContain('aria-label="指南"')
    expect(guide_source).not.toContain('class="section-heading-row"')
    expect(guide_source).not.toMatch(/<h2 class="section-title">[\s\S]*指南列表/)
    expect(links_source).toContain('aria-label="連結"')
    expect(links_source).not.toContain('class="section-heading-row"')
    expect(links_source).not.toMatch(/<h2 class="section-title">[\s\S]*相關入口/)
    expect(search_source).toContain('aria-label="搜尋"')
    expect(search_source).not.toContain('class="section-heading-row"')
    expect(search_source).not.toMatch(/<h2 class="section-title">[\s\S]*搜看看/)

    expect(home_source).toContain('<Transition')
    expect(home_source).toContain('name="home-results"')
    expect(home_source).toContain(':key="active_home_category_key"')
    expect(catalog_css).toMatch(/\.breadcrumb-separator\s*\{[\s\S]*margin-inline:\s*[^;]+;/)
    expect(catalog_css).toContain('.breadcrumb-link')
    expect(catalog_css).toContain('.breadcrumb-link:focus-visible')
    expect(catalog_css).toContain('.home-results-enter-active')
    expect(catalog_css).toContain('.home-results-leave-active')
    expect(catalog_css).toContain('.home-results-enter-from')
    expect(catalog_css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.home-results-enter-active/)
  })

  it('should wrap Nuxt with UApp for Nuxt UI providers', () => {
    const app_source = readFileSync(new URL('../app/app.vue', import.meta.url), 'utf8')

    expect(app_source).toContain('<UApp>')
    expect(app_source).toContain('<NuxtPage />')
  })

  it('should set the production document title from the app shell', () => {
    const app_source = readFileSync(new URL('../app/app.vue', import.meta.url), 'utf8')

    expect(app_source).toContain('useHead(')
    expect(app_source).toContain('title: SITE_TITLE')
  })

  it('should prevent horizontal rubber-band overflow on tablet viewports', () => {
    const reset_css = readFileSync(new URL('../app/assets/styles/reset.css', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(reset_css).toContain('overflow-x: clip')
    expect(catalog_css).toContain('.compact-app-shell')
    expect(catalog_css).toContain('max-width: 100%')
    expect(catalog_css).toContain('overflow-x: clip')
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
    expect(link_rows_source).toContain('getResourceRowLinkAttributes')
    expect(link_rows_source).toContain("target: '_blank'")
    expect(link_rows_source).toContain("rel: 'noopener noreferrer'")
  })

  it('should expose desktop product category navigation without adding it to mobile or tablet nav', () => {
    const home_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')
    const nav_source = readFileSync(new URL('../app/components/app-navigation.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(home_source).toContain('home-category-chip-list')
    expect(nav_source).toContain('desktop-category-items')
    expect(nav_source).toContain('desktop-category-link')
    expect(nav_source).toContain('category.id === \'all\' ? \'/\' : `/?category=${category.id}`')
    expect(nav_source).toContain('desktop_category_items')
    expect(catalog_css).toContain('.desktop-category-items')
    expect(catalog_css).toContain('.desktop-category-link')
    expect(catalog_css).toContain('.compact-app-bottom-tabs .app-nav-button')
    expect(catalog_css).toContain('.compact-app-rail .app-nav-button')
    expect(catalog_css).toContain('.home-category-chip-list {\n    display: none;\n  }')
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

    expect(detail_page_source).toContain('useProductDetailData')
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
    expect(detail_source).toContain('detail.long_description || detail.summary')
    expect(detail_source).toContain('AI 怎麼說')
    expect(detail_source).toContain('v-if="detail.llm_description"')
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

  it('should render product detail information in the documented semantic order', () => {
    const detail_source = readFileSync(new URL('../app/components/product-detail.vue', import.meta.url), 'utf8')
    const ordered_tokens = [
      'detail-title',
      'detail-taxonomy-row',
      'detail-price',
      'detail-dw-says',
      'detail-llm-says',
      'detail-buy-cta',
      'detail-fine-print',
    ]
    const token_positions = ordered_tokens.map((token) => detail_source.indexOf(token))

    expect(token_positions.every((position) => position >= 0)).toBe(true)

    for (let i = 1; i < token_positions.length; i += 1) {
      expect(token_positions[i]).toBeGreaterThan(token_positions[i - 1])
    }

    expect(detail_source).toContain(':description="detail.long_description || detail.summary"')
    expect(detail_source).toContain(':description="detail.llm_description"')
    expect(detail_source).toContain('detail.category_label')
    expect(detail_source.indexOf('detail.category_label')).toBeLessThan(detail_source.indexOf('detail.channel_label'))
    expect(detail_source.indexOf('detail.channel_label')).toBeLessThan(detail_source.indexOf('v-for="tag in detail.tag_labels"'))
    expect(detail_source).not.toContain('dw_says')
    expect(detail_source).not.toContain('detail.description')
    expect(detail_source).not.toContain(':description="detail.summary"')
  })

  it('should keep detail taxonomy chips visually consistent and DW copy WCAG readable', () => {
    const detail_source = readFileSync(new URL('../app/components/product-detail.vue', import.meta.url), 'utf8')
    const chip_source = readFileSync(new URL('../app/components/catalog-pill.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(detail_source).toContain('class="detail-taxonomy-row"')
    expect(detail_source).not.toContain('detail-meta-row')
    expect(detail_source).not.toContain('detail-tag-list')
    expect(detail_source).not.toContain('detail-category')
    expect(detail_source).not.toContain('detail-tag')
    expect(chip_source).toContain('catalog-pill')
    expect(chip_source).toContain('catalog-pill--${variant}')
    expect(chip_source).toContain('to?:')
    expect(chip_source).toContain('<NuxtLink')
    expect(chip_source).toContain(':to="to"')
    expect(chip_source).not.toContain("path: '/search'")
    expect(chip_source).not.toContain("path: '/'")
    expect(detail_source).toContain(':to="{ path: \'/\', query: { category: detail.category_id } }"')
    expect(detail_source).toContain(':to="{ path: \'/search\', query: { q: detail.channel_label } }"')
    expect(detail_source).toContain(':to="{ path: \'/search\', query: { q: tag } }"')
    expect(catalog_css).toContain('.detail-taxonomy-row')
    expect(catalog_css).toContain('.catalog-pill')
    expect(catalog_css).toContain('padding: 0 10px;')
    expect(catalog_css).toMatch(/@media \(min-width: 768px\)[\s\S]*\.catalog-pill \{[\s\S]*padding: 0 14px;/)
    expect(catalog_css).toMatch(/@media \(min-width: 1200px\)[\s\S]*\.catalog-pill \{[\s\S]*padding: 0 14px;/)
    expect(catalog_css).toContain('.catalog-pill--default')
    expect(catalog_css).toMatch(/\.catalog-pill--dark \{[\s\S]*background: color-mix\(in srgb, var\(--dw-text\)/)
    expect(catalog_css).toMatch(/\.catalog-pill--dark \{[\s\S]*color: var\(--dw-bg\);/)
    expect(catalog_css).toMatch(/\.catalog-pill--accent \{[\s\S]*background: var\(--ui-primary\);/)
    expect(catalog_css).toMatch(/\.catalog-pill--accent \{[\s\S]*color: var\(--ui-text-inverted\);/)
    expect(catalog_css).not.toContain('color: #231405;')
    expect(catalog_css).not.toContain('.taxonomy-chip')
    expect(catalog_css).toContain('.detail-dw-says {')
    expect(catalog_css).toContain('background: var(--dw-panel-strong);')
    expect(catalog_css).toContain('color: var(--dw-text);')
    expect(getContrastRatio('#201c17', '#fff4dd')).toBeGreaterThanOrEqual(4.5)
  })

  it('should register product detail head metadata before async catalog loading', () => {
    const detail_page_source = readFileSync(new URL('../app/pages/products/[id].vue', import.meta.url), 'utf8')
    const use_head_index = detail_page_source.indexOf('useHead(')
    const catalog_await_index = detail_page_source.indexOf('await useProductDetailData(product_id)')

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

  it('should use deterministic system CJK fonts without provider font families', () => {
    const variable_css = readFileSync(new URL('../app/assets/styles/variables.css', import.meta.url), 'utf8')

    expect(variable_css).toContain("font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;")
    expect(variable_css).not.toContain('Inter')
    expect(variable_css).not.toContain('Noto Sans TC')
    expect(variable_css).toContain("'PingFang TC'")
    expect(variable_css).toContain("'Microsoft JhengHei'")
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
