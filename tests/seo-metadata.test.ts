import { describe, expect, it } from 'vitest'
import { ref, toValue } from 'vue'

import { buildSeoMeta, getOgImageUrl, SITE_OG_IMAGE, SITE_URL } from '../app/utils/seo-metadata'

describe('getOgImageUrl', () => {
  it('should fall back to the site OG image for a leading-slash local product image path (AC1)', () => {
    expect(getOgImageUrl('/products/images/x.jpg')).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for a local guide image path (AC1)', () => {
    expect(getOgImageUrl('/guides/images/x.jpg')).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for a local content image path without a leading slash (AC2)', () => {
    expect(getOgImageUrl('products/images/x.jpg')).toBe(SITE_OG_IMAGE)
  })

  it('should trim surrounding whitespace before detecting local content image paths (AC3)', () => {
    expect(getOgImageUrl('  /products/images/x.jpg  ')).toBe(SITE_OG_IMAGE)
  })

  it('should still resolve non-content relative paths to an absolute site URL (AC3)', () => {
    // 站台 URL 跟著 APP_URL 環境走（AC4），故期望值由 SITE_URL 導出、不寫死網域。
    expect(getOgImageUrl('/og-custom.jpg')).toBe(`${SITE_URL}og-custom.jpg`)
  })

  it('should fall back to the site OG image for an empty string (AC4)', () => {
    expect(getOgImageUrl('')).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for a whitespace-only string (AC4)', () => {
    expect(getOgImageUrl('   ')).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for null (AC4)', () => {
    expect(getOgImageUrl(null)).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for undefined (AC4)', () => {
    expect(getOgImageUrl(undefined)).toBe(SITE_OG_IMAGE)
  })

  it('should return an https absolute URL unchanged (AC5)', () => {
    expect(getOgImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  })

  it('should return an http absolute URL unchanged (AC5)', () => {
    expect(getOgImageUrl('http://example.com/a.jpg')).toBe('http://example.com/a.jpg')
  })

  it('should treat the absolute-URL scheme case-insensitively and return it trimmed (AC5)', () => {
    expect(getOgImageUrl('  HTTPS://example.com/a.jpg  ')).toBe('HTTPS://example.com/a.jpg')
  })
})

describe('buildSeoMeta', () => {
  it('should fan the static title/description/url/image out across og and twitter fields without imageAlt (AC1, AC5)', () => {
    const meta = buildSeoMeta({
      title: '分類｜DW嚴選',
      description: '瀏覽分類主題下的精選內容。',
      url: 'https://dwselect.applepig.net/category/audio',
      image: SITE_OG_IMAGE,
    })

    expect(meta).toEqual({
      title: '分類｜DW嚴選',
      ogTitle: '分類｜DW嚴選',
      twitterTitle: '分類｜DW嚴選',
      description: '瀏覽分類主題下的精選內容。',
      ogDescription: '瀏覽分類主題下的精選內容。',
      twitterDescription: '瀏覽分類主題下的精選內容。',
      ogUrl: 'https://dwselect.applepig.net/category/audio',
      ogImage: SITE_OG_IMAGE,
      twitterImage: SITE_OG_IMAGE,
      twitterCard: 'summary_large_image',
    })
  })

  it('should omit ogImageAlt and twitterImageAlt entirely when imageAlt is not provided (AC1, AC5)', () => {
    const meta = buildSeoMeta({
      title: 'T',
      description: 'D',
      url: 'U',
      image: 'I',
    })

    expect(meta).not.toHaveProperty('ogImageAlt')
    expect(meta).not.toHaveProperty('twitterImageAlt')
  })

  it('should pin twitterCard to summary_large_image regardless of input (AC1, AC5)', () => {
    const meta = buildSeoMeta({ title: 'T', description: 'D', url: 'U', image: 'I' })

    expect(meta.twitterCard).toBe('summary_large_image')
  })

  it('should add ogImageAlt and twitterImageAlt from imageAlt for the dynamic detail path (AC1, AC5)', () => {
    const meta = buildSeoMeta({
      title: '商品名｜DW嚴選',
      description: '商品摘要。',
      url: 'https://dwselect.applepig.net/products/abc',
      image: 'https://dwselect.applepig.net/products/images/hero.jpg',
      imageAlt: '商品主視覺',
    })

    expect(meta.ogImage).toBe('https://dwselect.applepig.net/products/images/hero.jpg')
    expect(meta.twitterImage).toBe('https://dwselect.applepig.net/products/images/hero.jpg')
    expect(meta.ogImageAlt).toBe('商品主視覺')
    expect(meta.twitterImageAlt).toBe('商品主視覺')
  })

  it('should pass a Ref input through to every mapped field so reactivity is preserved (AC2)', () => {
    const title = ref('初始標題')
    const meta = buildSeoMeta({ title, description: 'D', url: 'U', image: 'I' })

    expect(meta.title).toBe(title)
    expect(meta.ogTitle).toBe(title)
    expect(meta.twitterTitle).toBe(title)

    title.value = '更新後標題'
    expect(toValue(meta.ogTitle)).toBe('更新後標題')
    expect(toValue(meta.twitterTitle)).toBe('更新後標題')
  })

  it('should pass a getter input through unevaluated so it stays a reactive source (AC2)', () => {
    let current = 'A'
    const getter = () => current
    const meta = buildSeoMeta({ title: 'T', description: 'D', url: 'U', image: getter, imageAlt: getter })

    expect(meta.ogImage).toBe(getter)
    expect(meta.twitterImage).toBe(getter)

    current = 'B'
    expect(toValue(meta.ogImage)).toBe('B')
    expect(toValue(meta.ogImageAlt)).toBe('B')
  })
})
