import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import nuxt_config from '../nuxt.config'
import package_json from '../package.json'
import { getPublishedProductsQuery } from '../app/utils/get-published-products-query'

describe('Nuxt SSG baseline', () => {
  it('should enable Nuxt Content, Nuxt UI and static generation baseline', () => {
    expect(nuxt_config.modules).toContain('@nuxt/content')
    expect(nuxt_config.modules).toContain('@nuxt/ui')
    expect(nuxt_config.nitro?.preset).toBe('static')
  })

  it('should build the search index before static generation', () => {
    expect(package_json.scripts.generate).toContain('pnpm build:search-index')
  })

  it('should expose a published products query helper skeleton', () => {
    expect(getPublishedProductsQuery()).toEqual({
      collection: 'products',
      where: {
        status: 'published',
      },
      sort: [
        { category: 'ASC' },
        { published_at: 'DESC' },
        { name: 'ASC' },
      ],
    })
  })

  it('should wire the public search input to Nuxt UI with external filtering', () => {
    const page_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')

    expect(page_source).toContain('<UInputMenu')
    expect(page_source).toContain('v-model:search-term="search_query"')
    expect(page_source).not.toContain('v-model="search_query"')
    expect(page_source).toContain(':ignore-filter="true"')
    expect(page_source).toContain(':reset-search-term-on-select="false"')
    expect(page_source).toContain("await import('../utils/search/client-search')")
    expect(page_source).not.toContain("import { getClientSearchSuggestions } from '../utils/search/client-search'")
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

  it('should expose searchable loading, failure and empty states in the public catalog source', () => {
    const page_source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')

    expect(page_source).toContain('role="status"')
    expect(page_source).toContain('catalog-search-status')
    expect(page_source).toContain('搜尋 index 載入中')
    expect(page_source).toContain('搜尋 index 載入失敗')
    expect(page_source).toContain('找不到符合條件的商品')
    expect(page_source).toContain('目前沒有已上架商品')
  })

  it('should keep catalog controls and long product text responsive across phone, tablet and desktop widths', () => {
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(catalog_css).toContain('@media (min-width: 760px)')
    expect(catalog_css).toContain('@media (min-width: 1024px)')
    expect(catalog_css).toContain('@media (max-width: 640px)')
    expect(catalog_css).toContain('.product-card')
    expect(catalog_css).toContain('min-width: 0')
    expect(catalog_css).toContain('overflow-wrap: anywhere')
    expect(catalog_css).toContain('word-break: break-word')
    expect(catalog_css).toContain('text-overflow: ellipsis')
    expect(catalog_css).toContain('.purchase-link:focus-visible')
    expect(catalog_css).toContain('.category-tab:focus-visible')
    expect(catalog_css).toContain('.clear-search-button:focus-visible')
  })

  it('should document static search-index generation commands', () => {
    const readme_source = readFileSync(new URL('../README.md', import.meta.url), 'utf8')

    expect(readme_source).toContain('pnpm build:search-index')
    expect(readme_source).toContain('public/search-index.json')
    expect(readme_source).toContain('pnpm generate')
  })
})
