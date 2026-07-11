import { describe, expect, it } from 'vitest'
import { ref, toValue } from 'vue'

import { buildSeoMeta, getOgImageUrl, SITE_OG_IMAGE, SITE_URL } from '../app/utils/seo-metadata'

describe('getOgImageUrl', () => {
  // 期望值一律由 SITE_URL 導出、不寫死網域：站台 URL 跟著 APP_URL 環境走（ADR-035-2）。
  it('should map a leading-slash local product image path to the optimized webp URL (036 AC1)', () => {
    expect(getOgImageUrl('/products/images/x.jpg')).toBe(`${SITE_URL}images/products/x.webp`)
  })

  it('should map a local guide image path to the optimized webp URL (036 AC1)', () => {
    expect(getOgImageUrl('/guides/images/x.jpg')).toBe(`${SITE_URL}images/guides/x.webp`)
  })

  it('should map a local content image path without a leading slash the same way (036 AC1)', () => {
    expect(getOgImageUrl('products/images/x.jpg')).toBe(`${SITE_URL}images/products/x.webp`)
  })

  it('should trim surrounding whitespace before mapping local content image paths (036 AC1)', () => {
    expect(getOgImageUrl('  /products/images/x.jpg  ')).toBe(`${SITE_URL}images/products/x.webp`)
  })

  it.each(['png', 'jpeg', 'gif', 'avif', 'webp'])(
    'should always emit a .webp og URL for a .%s image_file (036 Case 2)',
    (extension) => {
      expect(getOgImageUrl(`/products/images/hero.${extension}`)).toBe(`${SITE_URL}images/products/hero.webp`)
    },
  )

  it('should keep interior dots and only replace the final extension, matching the build stem rule (036 Case 2)', () => {
    // build-content-images 以 parse(name).name 決定輸出檔名，stem 保留中間的點。
    expect(getOgImageUrl('/guides/images/photo.v2.jpg')).toBe(`${SITE_URL}images/guides/photo.v2.webp`)
  })

  it('should still resolve non-content relative paths to an absolute site URL', () => {
    expect(getOgImageUrl('/og-custom.jpg')).toBe(`${SITE_URL}og-custom.jpg`)
  })

  it('should fall back to the site OG image for an empty string (036 AC3)', () => {
    expect(getOgImageUrl('')).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for a whitespace-only string (036 AC3)', () => {
    expect(getOgImageUrl('   ')).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for null (036 AC3)', () => {
    expect(getOgImageUrl(null)).toBe(SITE_OG_IMAGE)
  })

  it('should fall back to the site OG image for undefined (036 AC3)', () => {
    expect(getOgImageUrl(undefined)).toBe(SITE_OG_IMAGE)
  })

  it('should return an https absolute URL unchanged (036 AC3)', () => {
    expect(getOgImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  })

  it('should return an http absolute URL unchanged (036 AC3)', () => {
    expect(getOgImageUrl('http://example.com/a.jpg')).toBe('http://example.com/a.jpg')
  })

  it('should treat the absolute-URL scheme case-insensitively and return it trimmed (036 AC3)', () => {
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
