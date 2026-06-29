import { describe, expect, it } from 'vitest'

import { extractContentId } from '../../app/utils/content/extract-content-id'

describe('extractContentId', () => {
  it('should take the last path segment and strip the .json suffix', () => {
    expect(extractContentId('products/sample-product.json')).toBe('sample-product')
  })

  it('should handle nested paths', () => {
    expect(extractContentId('content/products/2026/sample.json')).toBe('sample')
  })

  it('should return the id unchanged when there is no slash', () => {
    expect(extractContentId('sample-product')).toBe('sample-product')
  })

  it('should keep the value when there is no .json suffix', () => {
    expect(extractContentId('products/sample-product')).toBe('sample-product')
  })

  it('should only strip a trailing .json, not an embedded one', () => {
    expect(extractContentId('products/sample.json.backup')).toBe('sample.json.backup')
  })

  it('should strip a trailing query string before removing the .json suffix', () => {
    // dev 模式瀏覽器對 detail fetch 可能帶 query（如 ?x=1）；query 須在去副檔名前切掉，
    // 否則 `.json` 不在結尾、無法剝除，id 會還原成 `foo.json?x=1` 而誤 404。
    expect(extractContentId('/api/products/foo.json?x=1')).toBe('foo')
  })

  it('should strip a query string even when the last segment has no .json suffix', () => {
    expect(extractContentId('products/sample-product?ref=home')).toBe('sample-product')
  })

  it('should fall back to the original id for an empty string', () => {
    expect(extractContentId('')).toBe('')
  })
})
