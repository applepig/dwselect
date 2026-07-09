import { describe, expect, it } from 'vitest'

import { buildTaxonomyPageSeo } from '../../app/utils/published-products/taxonomy-page-seo'
import { SITE_OG_IMAGE, SITE_URL } from '../../app/utils/seo-metadata'
import { SITE_NAME } from '../../app/utils/site-name'

describe('buildTaxonomyPageSeo', () => {
  it('should build a category page title containing the label and the site name', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'category', id: 'computer', label: '電腦', description: null })

    expect(seo.title).toContain('電腦')
    expect(seo.title).toContain(SITE_NAME)
  })

  it('should set the canonical url to /category/{id} for a category', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'category', id: 'computer', label: '電腦', description: null })

    expect(seo.canonical).toBe(`${SITE_URL}category/computer`)
  })

  it('should set the canonical url to /tag/{id} for a tag', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'tag', id: 'typing', label: '輸入', description: '輸入設備簡介' })

    expect(seo.canonical).toBe(`${SITE_URL}tag/typing`)
  })

  it('should set the canonical url to /brand/{id} for a brand (single canonical, ADR-10)', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'brand', id: 'panasonic', label: 'Panasonic', description: 'Panasonic 品牌商品' })

    expect(seo.canonical).toBe(`${SITE_URL}brand/panasonic`)
  })

  it('should set the canonical url to /channel/{id} for a channel (single canonical, ADR-10)', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'channel', id: 'pchome', label: 'PChome', description: null })

    expect(seo.canonical).toBe(`${SITE_URL}channel/pchome`)
  })

  it('should use the tag description as the meta description when present', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'tag', id: 'typing', label: '輸入', description: '輸入設備簡介' })

    expect(seo.description).toBe('輸入設備簡介')
  })

  it('should fall back to a label-derived description when the taxonomy has none', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'category', id: 'computer', label: '電腦', description: null })

    expect(seo.description).toContain('電腦')
    expect(seo.description.length).toBeGreaterThan(0)
  })

  it('should use the site default OG image', () => {
    const seo = buildTaxonomyPageSeo({ taxonomy_kind: 'category', id: 'computer', label: '電腦', description: null })

    expect(seo.og_image).toBe(SITE_OG_IMAGE)
  })
})
