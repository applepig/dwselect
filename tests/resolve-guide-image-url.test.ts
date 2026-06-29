import { describe, expect, it } from 'vitest'

import { resolveGuideImageUrl } from '../app/utils/content-images/resolve-guide-image-url'

describe('resolveGuideImageUrl', () => {
  it('should resolve a local guide image file to its content image path', () => {
    const url = resolveGuideImageUrl({ image_file: 'rice-intro.jpg', image_url: null })

    expect(url).toBe('/guides/images/rice-intro.jpg')
  })

  it('should fall back to the external image url when no local image file is present', () => {
    const url = resolveGuideImageUrl({ image_file: null, image_url: 'https://example.com/rice.jpg' })

    expect(url).toBe('https://example.com/rice.jpg')
  })

  it('should prefer the local image file over the external image url when both are present', () => {
    const url = resolveGuideImageUrl({ image_file: 'rice-intro.jpg', image_url: 'https://example.com/rice.jpg' })

    expect(url).toBe('/guides/images/rice-intro.jpg')
  })

  it('should return null when the guide has neither a local image file nor an external image url', () => {
    expect(resolveGuideImageUrl({ image_file: null, image_url: null })).toBeNull()
    expect(resolveGuideImageUrl({})).toBeNull()
  })
})
