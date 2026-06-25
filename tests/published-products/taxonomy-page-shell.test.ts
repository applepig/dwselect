import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const project_root_url = new URL('../../', import.meta.url)

function readPage(file_path: string): string {
  return readFileSync(new URL(file_path, project_root_url), 'utf8')
}

const category_source = readPage('app/pages/category/[id].vue')
const tag_source = readPage('app/pages/tag/[id].vue')

describe('taxonomy page shells', () => {
  it('should throw a fatal 404 when the taxonomy resolves to no data, matching detail pages', () => {
    for (const source of [category_source, tag_source]) {
      expect(source).toContain('=== null')
      expect(source).toContain('createError({')
      expect(source).toContain('statusCode: 404')
      expect(source).toContain('fatal: true')
    }
  })

  it('should resolve data through the shared taxonomy page composable with the correct kind', () => {
    expect(category_source).toContain("useTaxonomyPageData('category'")
    expect(tag_source).toContain("useTaxonomyPageData('tag'")
  })

  it('should set the canonical url to the prefixed taxonomy route', () => {
    expect(category_source).toContain('getCanonicalUrl(`/category/${category_id}`)')
    expect(tag_source).toContain('getCanonicalUrl(`/tag/${tag_id}`)')
    for (const source of [category_source, tag_source]) {
      expect(source).toContain("rel: 'canonical'")
      expect(source).toContain('href: canonical_url')
    }
  })

  it('should reuse the shared SEO builder and the site default OG image, not bespoke meta', () => {
    for (const source of [category_source, tag_source]) {
      expect(source).toContain('buildTaxonomyPageSeo')
      expect(source).toContain('ogImage: SITE_OG_IMAGE')
      expect(source).toContain("twitterCard: 'summary_large_image'")
    }
  })

  it('should compose the shared TaxonomyPage component rather than inlining list markup', () => {
    for (const source of [category_source, tag_source]) {
      expect(source).toContain('<TaxonomyPage')
      expect(source).not.toContain('product-grid')
      expect(source).not.toContain('<ResourceList')
    }
  })
})
