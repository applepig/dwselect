import { describe, expect, it } from 'vitest'

import { resolveBreadcrumbItems } from '../../app/utils/breadcrumb/resolve-breadcrumb-items'

const taxonomies = {
  categories: [
    { id: 'computer', label: '電腦', short_label: '電腦', aliases: [], nav_visible: true, sort_order: 1 },
  ],
  channels: [
    { id: 'momo', label: 'momo', aliases: [], host_patterns: [], sort_order: 1 },
    { id: 'other-channel', label: '其他通路', aliases: [], host_patterns: [], sort_order: 2 },
  ],
  tags: [
    { id: 'typing', label: '輸入', description: '', aliases: [], nav_visible: true, sort_order: 1 },
  ],
  brands: [
    { id: 'panasonic', label: 'Panasonic', description: '', aliases: [], nav_visible: true, sort_order: 1 },
  ],
}

const shell = {
  desktop_category_items: [
    { id: 'computer', label: '電腦', count: 3 },
  ],
  product_breadcrumb_by_id: {},
  guide_breadcrumb_by_id: {},
  taxonomies,
} as never

describe('resolveBreadcrumbItems for taxonomy pages', () => {
  it('should resolve a category page breadcrumb to its category label', () => {
    expect(resolveBreadcrumbItems('/category/computer', {}, shell)).toEqual([{ label: '電腦' }])
  })

  it('should resolve a tag page breadcrumb to its tag label', () => {
    expect(resolveBreadcrumbItems('/tag/typing', {}, shell)).toEqual([{ label: '輸入' }])
  })

  it('should resolve a brand page breadcrumb to its brand label', () => {
    expect(resolveBreadcrumbItems('/brand/panasonic', {}, shell)).toEqual([{ label: 'Panasonic' }])
  })

  it('should resolve a channel page breadcrumb to its channel label, never the category fallback', () => {
    expect(resolveBreadcrumbItems('/channel/other-channel', {}, shell)).toEqual([{ label: '其他通路' }])
  })

  it('should fall back to the raw id when the taxonomy id is unknown', () => {
    expect(resolveBreadcrumbItems('/tag/unknown-tag', {}, shell)).toEqual([{ label: 'unknown-tag' }])
  })

  it('should resolve brand label even when the id also exists nowhere in tags', () => {
    // brand id 必須由 /brand 前綴解析到 brand label，不可被 tag getter 的 raw-id fallback 覆蓋
    expect(resolveBreadcrumbItems('/brand/panasonic', {}, shell)[0]?.label).toBe('Panasonic')
  })
})

describe('resolveBreadcrumbItems for existing routes (regression)', () => {
  it('should return an empty breadcrumb for the home root', () => {
    expect(resolveBreadcrumbItems('/', {}, shell)).toEqual([])
  })

  it('should resolve the active home category label from the category query', () => {
    expect(resolveBreadcrumbItems('/', { category: 'computer' }, shell)).toEqual([{ label: '電腦' }])
  })

  it('should label the guide index route', () => {
    expect(resolveBreadcrumbItems('/guide', {}, shell)).toEqual([{ label: '指南' }])
  })

  it('should resolve a product detail breadcrumb from its detail entry', () => {
    const shell_with_product = {
      ...shell,
      product_breadcrumb_by_id: { 'a-product': { name: '商品甲', category_id: 'computer', category_label: '電腦' } },
    } as never

    expect(resolveBreadcrumbItems('/products/a-product', {}, shell_with_product)).toEqual([
      { label: '電腦', to: { path: '/', query: { category: 'computer' } } },
      { label: '商品甲' },
    ])
  })

  it('should fall back to a generic label when a product detail entry is missing', () => {
    expect(resolveBreadcrumbItems('/products/missing', {}, shell)).toEqual([{ label: '商品詳情' }])
  })
})
