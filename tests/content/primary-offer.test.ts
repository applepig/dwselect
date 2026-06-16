import { describe, expect, it } from 'vitest'

import { getPrimaryOffer } from '../../app/utils/content/primary-offer'
import { makeProduct } from '../published-products/fixtures'

describe('getPrimaryOffer', () => {
  it('should return the first offer of the product', () => {
    const product = makeProduct({ id: 'sample', status: 'published', name: '商品' })

    expect(getPrimaryOffer(product)).toBe(product.offers[0])
  })

  it('should return the first offer when multiple offers exist', () => {
    const product = makeProduct({
      id: 'sample',
      status: 'published',
      name: '商品',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://24h.pchome.com.tw/a',
          price_text: 'NT$ 100',
          price: { amount: 100, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
        {
          channel_id: 'momo',
          url: 'https://www.momoshop.com.tw/b',
          price_text: 'NT$ 200',
          price: { amount: 200, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    expect(getPrimaryOffer(product).channel_id).toBe('pchome')
  })
})
