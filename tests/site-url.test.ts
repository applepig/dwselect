import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getSiteUrl } from '../scripts/site-url'
import { SITE_NAME } from '../app/utils/site-name'
import { buildTaxonomyPageSeo } from '../app/utils/published-products/taxonomy-page-seo'

describe('getSiteUrl', () => {
  const original_app_url = process.env.APP_URL

  beforeEach(() => {
    delete process.env.APP_URL
  })

  afterEach(() => {
    if (original_app_url === undefined) {
      delete process.env.APP_URL
    }
    else {
      process.env.APP_URL = original_app_url
    }
  })

  it('should derive the site URL from APP_URL at call time', () => {
    process.env.APP_URL = 'example.test'

    expect(getSiteUrl()).toBe('https://example.test/')
  })

  it('should follow APP_URL when it changes to the production host', () => {
    process.env.APP_URL = 'dwselect.applepig.net'

    expect(getSiteUrl()).toBe('https://dwselect.applepig.net/')
  })

  it('should throw a recognizable error when APP_URL is missing', () => {
    expect(() => getSiteUrl()).toThrow(/APP_URL/)
  })
})

describe('SITE_NAME single source', () => {
  it('should compose SEO titles from the single shared SITE_NAME (AC6)', () => {
    // AC6 payload 側（site.name === SITE_NAME）由 public-discovery.test 覆蓋；此處驗 SEO meta 側
    // 亦讀同一 SITE_NAME，兩者合起來即證 payload 與 SEO 讀到同一 resolved 值。
    expect(SITE_NAME).toBe('DW嚴選')

    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'category', id: 'audio', label: '音響', description: null })

    expect(seo.title).toContain(SITE_NAME)
  })
})
