import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

const project_root_url = new URL('../', import.meta.url)

function readProjectFile(file_path: string): string {
  return readFileSync(new URL(file_path, project_root_url), 'utf8')
}

describe('launch SEO static assets', () => {
  it('should provide local brand assets and remove the Vite template entrypoint', () => {
    expect(existsSync(new URL('public/favicon.ico', project_root_url))).toBe(true)
    expect(existsSync(new URL('public/og-image.png', project_root_url))).toBe(true)
    expect(existsSync(new URL('index.html', project_root_url))).toBe(false)
  })
})

describe('launch SEO metadata contract', () => {
  const app_source = readProjectFile('app/app.vue')
  const home_source = readProjectFile('app/pages/index.vue')
  const guide_source = readProjectFile('app/pages/guide.vue')
  const links_source = readProjectFile('app/pages/links.vue')
  const search_source = readProjectFile('app/pages/search.vue')
  const product_source = readProjectFile('app/pages/products/[id].vue')
  const seo_source = readProjectFile('app/utils/seo-metadata.ts')
  const combined_public_source = [app_source, home_source, guide_source, links_source, search_source, product_source, seo_source].join('\n')

  it('should define the approved site-level SEO constants with the production URL', () => {
    expect(seo_source).toContain("export const SITE_URL = 'https://dwselect.applepig.net/'")
    expect(seo_source).toContain("export const SITE_NAME = 'DW嚴選'")
    expect(seo_source).toContain("export const SITE_DESCRIPTION = '值得買、值得看、值得收藏的選物清單。'")
    expect(seo_source).toContain("export const SITE_OG_IMAGE = 'https://dwselect.applepig.net/og-image.png'")
    expect(combined_public_source).not.toContain('dwselect.toybox.local')
  })

  it('should set the global language, favicon, canonical and default social metadata', () => {
    expect(app_source).toContain("lang: 'zh-Hant'")
    expect(app_source).toContain("rel: 'icon'")
    expect(app_source).toContain("href: '/favicon.ico'")
    expect(app_source).toContain("rel: 'canonical'")
    expect(app_source).toContain('href: SITE_URL')
    expect(app_source).toContain('useSeoMeta({')
    expect(app_source).toContain('description: SITE_DESCRIPTION')
    expect(app_source).toContain('ogImage: SITE_OG_IMAGE')
    expect(app_source).toContain("twitterCard: 'summary_large_image'")
  })

  it('should set homepage metadata from the approved site copy and default OG image', () => {
    expect(home_source).toContain('title: SITE_TITLE')
    expect(home_source).toContain('description: SITE_DESCRIPTION')
    expect(home_source).toContain('ogTitle: SITE_NAME')
    expect(home_source).toContain('ogDescription: SITE_DESCRIPTION')
    expect(home_source).toContain('ogImage: SITE_OG_IMAGE')
    expect(home_source).toContain("twitterCard: 'summary_large_image'")
    expect(home_source).toContain("getCanonicalUrl('/')")
  })

  it('should set page-specific metadata and canonical URLs for guide, links and search pages', () => {
    expect(guide_source).toContain('title: `指南｜${SITE_NAME}`')
    expect(guide_source).toContain('GUIDE_DESCRIPTION')
    expect(guide_source).toContain("getCanonicalUrl('/guide')")

    expect(links_source).toContain('title: `連結｜${SITE_NAME}`')
    expect(links_source).toContain('LINKS_DESCRIPTION')
    expect(links_source).toContain("getCanonicalUrl('/links')")

    expect(search_source).toContain('title: `搜尋｜${SITE_NAME}`')
    expect(search_source).toContain('SEARCH_DESCRIPTION')
    expect(search_source).toContain("getCanonicalUrl('/search')")
  })

  it('should set product-specific metadata with summary fallback and default OG image', () => {
    expect(product_source).toContain('getSeoDescription(product_detail.value?.summary)')
    expect(product_source).toContain('`${product_detail.value.name}｜${SITE_NAME}`')
    expect(product_source).toContain('getCanonicalUrl(`/products/${product_detail.value.id}`)')
    expect(product_source).toContain('useProductDetailData(product_id)')
    expect(product_source).toContain('ogImage: SITE_OG_IMAGE')
    expect(product_source).toContain('twitterImage: SITE_OG_IMAGE')
    expect(seo_source).toContain('return trimmed_description.length === 0 ? SITE_DESCRIPTION : trimmed_description')
  })
})

describe('launch SEO error page', () => {
  it('should provide a friendly not found page and a home action', () => {
    const error_source = readProjectFile('app/error.vue')

    expect(error_source).toContain('找不到頁面')
    expect(error_source).toContain('回首頁')
    expect(error_source).toContain('發生錯誤')
    expect(error_source).toContain('clearError')
  })
})
