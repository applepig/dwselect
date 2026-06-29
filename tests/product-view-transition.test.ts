import { describe, expect, it } from 'vitest'

import { getProductViewTransitionName, getProductViewTransitionStyle } from '../app/utils/product-view-transition'

describe('product view transition helpers', () => {
  it('should generate stable names for every shared product transition part', () => {
    expect(getProductViewTransitionName('sample-product', 'card')).toBe('product-card-sample-product')
    expect(getProductViewTransitionName('sample-product', 'image')).toBe('product-image-sample-product')
    expect(getProductViewTransitionName('sample-product', 'title')).toBe('product-title-sample-product')
    expect(getProductViewTransitionName('sample-product', 'summary')).toBe('product-summary-sample-product')
    expect(getProductViewTransitionName('sample-product', 'price')).toBe('product-price-sample-product')
  })

  it('should expose the inline style shape used by Vue templates', () => {
    expect(getProductViewTransitionStyle('sample-product', 'price')).toEqual({
      'view-transition-name': 'product-price-sample-product',
    })
  })
})
