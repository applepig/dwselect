import { describe, expect, it } from 'vitest'

import { getOgImageUrl, SITE_OG_IMAGE } from '../app/utils/seo-metadata'

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
    expect(getOgImageUrl('/og-custom.jpg')).toBe('https://dwselect.applepig.net/og-custom.jpg')
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
