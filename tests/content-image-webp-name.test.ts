import { describe, expect, it } from 'vitest'

import { getContentImageWebpName } from '../app/utils/content-images/content-image-webp-name'

describe('getContentImageWebpName', () => {
  it.each(['jpg', 'jpeg', 'png', 'gif', 'avif', 'webp'])(
    'should replace a .%s extension with .webp',
    (extension) => {
      expect(getContentImageWebpName(`hero.${extension}`)).toBe('hero.webp')
    },
  )

  it('should keep interior dots and only replace the final extension', () => {
    expect(getContentImageWebpName('photo.v2.jpg')).toBe('photo.v2.webp')
  })
})
