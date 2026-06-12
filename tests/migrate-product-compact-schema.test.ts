import { describe, expect, it } from 'vitest'

import {
  getCompactProductMigration,
  getMigratedCategoryId,
  inferChannelId,
  parseProductPrice,
} from '../scripts/legacy/migrate-product-compact-schema'

const legacy_product = {
  id: 'sample-product',
  status: 'published',
  name: '範例商品',
  price_text: '125/kg',
  description: '推薦短評',
  purchase_url: 'https://24h.pchome.com.tw/prod/DBBY0M-A900GMBY7',
  image_url: 'https://example.com/product.jpg',
  category: '食材',
  tags: ['米'],
  reference_url: null,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

describe('compact product migration helpers', () => {
  it('should infer channel ids from the first-wave host mapping', () => {
    expect(inferChannelId('https://24h.pchome.com.tw/prod/DBBY0M-A900GMBY7')).toBe('pchome')
    expect(inferChannelId('https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=11521511')).toBe('momo')
    expect(inferChannelId('https://www.amazon.co.jp/dp/B0BNHWCWB4')).toBe('amazonjp')
    expect(inferChannelId('https://amzn.asia/d/isJwOlO')).toBe('amazonjp')
    expect(inferChannelId('https://www.amazon.com/Cable-FIBBR/dp/B09KZ435N6')).toBe('amazonus')
    expect(inferChannelId('https://www.costco.com.tw/Appliances/p/141934')).toBe('costco')
    expect(inferChannelId('https://www.ikea.com.tw/zh/products/electronics')).toBe('other')
  })

  it('should map legacy Chinese categories to compact category ids', () => {
    expect(getMigratedCategoryId('居家')).toBe('home')
    expect(getMigratedCategoryId('廚房')).toBe('kitchen')
    expect(getMigratedCategoryId('電腦')).toBe('computer')
    expect(getMigratedCategoryId('3C')).toBe('three-c')
    expect(getMigratedCategoryId('影音')).toBe('av')
    expect(getMigratedCategoryId('食材')).toBe('food')
  })

  it('should fallback blank or unknown legacy categories to other', () => {
    expect(getMigratedCategoryId('')).toBe('other')
    expect(getMigratedCategoryId('分類')).toBe('other')
  })

  it('should parse safe single prices without losing currency and unit semantics', () => {
    expect(parseProductPrice('125/kg', 'pchome')).toEqual({
      amount: 125,
      currency: 'TWD',
      unit: 'kilogram',
      label: null,
    })
    expect(parseProductPrice('200/kg', 'pchome')).toEqual({
      amount: 200,
      currency: 'TWD',
      unit: 'kilogram',
      label: null,
    })
    expect(parseProductPrice('￥100000', 'amazonjp')).toEqual({
      amount: 100000,
      currency: 'JPY',
      unit: 'each',
      label: null,
    })
    expect(parseProductPrice('￥1790', 'amazonjp')).toEqual({
      amount: 1790,
      currency: 'JPY',
      unit: 'each',
      label: null,
    })
  })

  it('should preserve labels for ranges, vague text and non-TWD dollar text', () => {
    expect(parseProductPrice('20~30鎂', 'amazonus')).toEqual({
      amount: null,
      currency: 'USD',
      unit: 'each',
      label: '20~30鎂',
    })
    expect(parseProductPrice('8000鎂', 'other')).toEqual({
      amount: 8000,
      currency: 'USD',
      unit: 'each',
      label: '8000鎂',
    })

    for (const price_text of ['249~349', '28000~32000', '低於60000', '大概16000', '比較貴一點', 'あるよー']) {
      expect(parseProductPrice(price_text, 'pchome')).toEqual({
        amount: null,
        currency: null,
        unit: null,
        label: price_text,
      })
    }
  })

  it('should migrate a product to compact schema and remove the legacy category field', () => {
    const migrated_product = getCompactProductMigration(legacy_product)

    expect(migrated_product).toEqual({
      id: 'sample-product',
      status: 'published',
      name: '範例商品',
      price_text: '125/kg',
      price: {
        amount: 125,
        currency: 'TWD',
        unit: 'kilogram',
        label: null,
      },
      summary: '推薦短評',
      description: '推薦短評',
      purchase_url: 'https://24h.pchome.com.tw/prod/DBBY0M-A900GMBY7',
      image_url: 'https://example.com/product.jpg',
      channel_id: 'pchome',
      category_id: 'food',
      tag_ids: [],
      reference_url: null,
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    })
    expect(migrated_product).not.toHaveProperty('category')
    expect(migrated_product).not.toHaveProperty('tags')
  })

  it('should migrate unknown categories to the other category', () => {
    const migrated_product = getCompactProductMigration({
      ...legacy_product,
      category: '未知分類',
    })

    expect(migrated_product.category_id).toBe('other')
  })
})
