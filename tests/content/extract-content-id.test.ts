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

  it('should fall back to the original id for an empty string', () => {
    expect(extractContentId('')).toBe('')
  })
})
