import { describe, expect, it } from 'vitest'

import { migrateGoogleSheetProducts, formatMigrationSummary } from '../scripts/migrate-google-sheet-products'

const header = 'name\tprice\tdesc\tlink_url\timg_url\ttags\tcategory\treference'
const legacy_header = 'name\tbrand\tdesc\tcategory\ttags\tprice_value\tprice\tlink_url\timg_url\treference'

describe('migrate Google Sheet products', () => {
  it('should migrate an inline cutover fixture without skipped rows and expose slug collisions', () => {
    const tsv = [
      legacy_header,
      'IKEA\t品牌 A\t第一筆描述\t居家\t收納 生活\t100\tNT$ 100\thttps://www.ikea.com.tw/product/a\thttps://example.com/ikea-a.jpg\thttps://example.com/ref-a',
      'IKEA\t品牌 B\t第二筆描述\t居家\t收納\t200\tNT$ 200\thttps://www.ikea.com.tw/product/b\thttps://example.com/ikea-b.jpg\t',
      'Panasonic\t品牌 C\t第三筆描述\t家電\t電器\t300\tNT$ 300\thttps://example.com/panasonic\thttps://example.com/panasonic.jpg\t',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toHaveLength(3)
    expect(result.summary.created_count).toBe(3)
    expect(result.summary.skipped_count).toBe(0)
    expect(result.summary.skipped).toEqual([])
    expect(result.summary.warnings).toEqual([])
    expect(result.summary.errors).toEqual([])
    expect(result.summary.collisions).toEqual([
      { row_number: 3, original_id: '2026-06-02-ikea', resolved_id: '2026-06-02-ikea-2' },
    ])
  })

  it('should use the product id as the output filename stem for inline cutover fixtures', () => {
    const tsv = [
      legacy_header,
      'IKEA\t品牌 A\t第一筆描述\t居家\t收納 生活\t100\tNT$ 100\thttps://www.ikea.com.tw/product/a\thttps://example.com/ikea-a.jpg\thttps://example.com/ref-a',
      'IKEA\t品牌 B\t第二筆描述\t居家\t收納\t200\tNT$ 200\thttps://www.ikea.com.tw/product/b\thttps://example.com/ikea-b.jpg\t',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toHaveLength(2)
    for (const product of result.products) {
      expect(product.file_name).toBe(`${product.content.id}.json`)
    }
  })

  it('should convert legacy TSV rows to stable product JSON with a fixed cutover date', () => {
    const tsv = [
      header,
      '商品名稱\tNT$ 1,990\t推薦文字\thttps://24h.pchome.com.tw/prod/ABC\thttps://example.com/image.jpg\t好物  3C\t\thttps://example.com/ref',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toEqual([
      {
        file_name: '2026-06-02-shang-pin-ming-cheng.json',
        content: {
          id: '2026-06-02-shang-pin-ming-cheng',
          status: 'published',
          name: '商品名稱',
          price_text: 'NT$ 1,990',
          description: '推薦文字',
          purchase_url: 'https://24h.pchome.com.tw/prod/ABC',
          image_url: 'https://example.com/image.jpg',
          category: '未分類',
          tags: ['好物', '3C', 'PCHome'],
          reference_url: 'https://example.com/ref',
          created_at: '2026-06-02T00:00:00+08:00',
          updated_at: '2026-06-02T00:00:00+08:00',
          published_at: '2026-06-02T00:00:00+08:00',
          unpublished_at: null,
          archived_at: null,
        },
      },
    ])
    expect(result.summary.created_count).toBe(1)
  })

  it('should treat an omitted final reference column as an empty reference value', () => {
    const tsv = [
      legacy_header,
      '商品名稱	品牌	推薦文字	分類	好物  3C	1990	NT$ 1,990	https://24h.pchome.com.tw/prod/ABC	https://example.com/image.jpg',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toHaveLength(1)
    expect(result.products[0]?.content.reference_url).toBeNull()
    expect(result.summary.warnings).toEqual([])
    expect(result.summary.skipped_count).toBe(0)
  })

  it('should add platform tags without duplicates from purchase URL host', () => {
    const tsv = [
      header,
      '美國商品\tUS$ 10\t描述\thttps://www.amazon.com/dp/ABC\thttps://example.com/a.jpg\t美亞 選物\t海外\t',
      '日本商品\t¥1000\t描述\thttps://www.amazon.co.jp/dp/ABC\thttps://example.com/b.jpg\t選物\t海外\t',
      'momo 商品\tNT$ 100\t描述\thttps://www.momoshop.com.tw/goods/GoodsDetail.jsp\thttps://example.com/c.jpg\t選物\t購物\t',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products[0]?.content.tags).toEqual(['美亞', '選物'])
    expect(result.products[1]?.content.tags).toEqual(['選物', '日亞'])
    expect(result.products[2]?.content.tags).toEqual(['選物', 'momo'])
  })

  it('should skip rows without a product name', () => {
    const tsv = [
      header,
      '   \tNT$ 1\t描述\thttps://example.com/p\thttps://example.com/i.jpg\ttag\t分類\t',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toEqual([])
    expect(result.summary.skipped).toEqual([
      { row_number: 2, reason: 'missing name' },
    ])
  })

  it('should warn and skip rows with mismatched column count', () => {
    const tsv = [
      header,
      '欄位不足\tNT$ 1',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toEqual([])
    expect(result.summary.warnings).toEqual([
      { row_number: 2, reason: 'column count mismatch: expected 8, got 2' },
    ])
    expect(result.summary.skipped_count).toBe(1)
  })

  it('should report errors and avoid writing products with invalid HTTP(S) URLs', () => {
    const tsv = [
      header,
      '壞連結\tNT$ 1\t描述\tjavascript:alert(1)\thttps://example.com/i.jpg\ttag\t分類\t',
      '壞圖片\tNT$ 2\t描述\thttps://example.com/p\t/relative.jpg\ttag\t分類\t',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products).toEqual([])
    expect(result.summary.errors).toEqual([
      { row_number: 2, field: 'purchase_url', reason: 'must be a valid HTTP(S) URL' },
      { row_number: 3, field: 'image_url', reason: 'must be a valid HTTP(S) URL' },
    ])
  })

  it('should append numeric suffix and summarize slug collisions', () => {
    const tsv = [
      header,
      'Same Product\tNT$ 1\t描述\thttps://example.com/a\thttps://example.com/a.jpg\ttag\t分類\t',
      'Same Product\tNT$ 2\t描述\thttps://example.com/b\thttps://example.com/b.jpg\ttag\t分類\t',
    ].join('\n')

    const result = migrateGoogleSheetProducts(tsv, { date: '2026-06-02' })

    expect(result.products.map((product) => product.file_name)).toEqual([
      '2026-06-02-same-product.json',
      '2026-06-02-same-product-2.json',
    ])
    expect(result.summary.collisions).toEqual([
      {
        row_number: 3,
        original_id: '2026-06-02-same-product',
        resolved_id: '2026-06-02-same-product-2',
      },
    ])
  })

  it('should format skipped rows and errors in a readable summary', () => {
    const summary = formatMigrationSummary({
      created_count: 1,
      skipped_count: 2,
      skipped: [{ row_number: 2, reason: 'missing name' }],
      warnings: [{ row_number: 3, reason: 'column count mismatch: expected 8, got 2' }],
      errors: [{ row_number: 4, field: 'purchase_url', reason: 'must be a valid HTTP(S) URL' }],
      collisions: [{ row_number: 5, original_id: '2026-06-02-same', resolved_id: '2026-06-02-same-2' }],
    })

    expect(summary).toContain('Created: 1')
    expect(summary).toContain('Skipped: 2')
    expect(summary).toContain('row 2: missing name')
    expect(summary).toContain('row 4 purchase_url: must be a valid HTTP(S) URL')
    expect(summary).toContain('row 5: 2026-06-02-same -> 2026-06-02-same-2')
  })
})
