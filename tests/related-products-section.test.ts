// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { onMounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import ProductCard from '../app/components/product-card.vue'
import RelatedProductsSection from '../app/components/related-products-section.vue'
import type { ProductCardView } from '../app/utils/public-content-view-types'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

const NuxtImgStub = {
  props: ['src', 'alt'],
  template: '<img data-component="nuxt-img" :src="src" :alt="alt" />',
}

const UIconStub = { props: ['name'], template: '<i :data-icon="name" />' }
const UCardStub = { props: ['ui'], template: '<div><slot /></div>' }
const CatalogPillStub = { props: ['to', 'variant'], template: '<span class="catalog-pill"><slot /></span>' }

function makeRelatedProduct(overrides: Partial<ProductCardView> = {}): ProductCardView {
  return {
    id: 'product-a',
    name: '商品 A',
    summary: '推薦短評 A',
    image_url: '/products/images/a.jpg',
    category_id: 'computer',
    category_label: '電腦',
    channel_id: 'pchome',
    channel_ids: ['pchome'],
    channel_label: 'PChome',
    price_label: 'NT$ 1,990',
    tag_ids: [],
    tag_labels: [],
    published_at: '2026-06-02T00:00:00+08:00',
    ...overrides,
  }
}

function mountRelatedProductsSection(products: ProductCardView[], title: string) {
  return mount(RelatedProductsSection, {
    props: { products, title },
    global: {
      components: { ProductCard },
      stubs: {
        NuxtLink: NuxtLinkStub,
        NuxtImg: NuxtImgStub,
        UIcon: UIconStub,
        UCard: UCardStub,
        CatalogPill: CatalogPillStub,
      },
    },
  })
}

describe('RelatedProductsSection', () => {
  // ProductCard 依賴 Nuxt auto-import 的 ref/onMounted 與 useBrokenImageFallback composable；bare vitest 需 stub。
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('以 ProductCard 渲染與 products 數量相同的卡片、每張連到 /products/{id}', () => {
    const wrapper = mountRelatedProductsSection([
      makeRelatedProduct({ id: 'product-a', name: '商品 A' }),
      makeRelatedProduct({ id: 'product-b', name: '商品 B' }),
    ], '你可能也喜歡')
    const grid = wrapper.find('.related-products-grid')
    const cards = grid.findAll('.product-card')
    const hrefs = grid.findAll('.product-card-link').map((link) => link.attributes('href'))

    expect(cards).toHaveLength(2)
    expect(hrefs).toEqual(['/products/product-a', '/products/product-b'])
  })

  it('每張卡顯示與首頁卡一致的欄位：商品名、summary、price pill、channel pill（AC6）', () => {
    const wrapper = mountRelatedProductsSection([
      makeRelatedProduct({
        name: '商品 A',
        summary: '推薦短評 A',
        price_label: 'NT$ 2,490',
        channel_label: 'PChome',
      }),
    ], '你可能也喜歡')
    const card = wrapper.find('.product-card')

    expect(card.find('.product-name').text()).toBe('商品 A')
    expect(card.find('.product-summary').text()).toBe('推薦短評 A')
    expect(card.find('.product-card-price').text()).toBe('NT$ 2,490')
    expect(card.find('.channel-badge').text()).toContain('PChome')
  })

  it('把 title 同時餵給 section 標題與 aria-label', () => {
    const wrapper = mountRelatedProductsSection([makeRelatedProduct()], '相關商品')
    const section = wrapper.find('.related-products-section')

    expect(wrapper.find('.related-products-title').text()).toBe('相關商品')
    expect(section.attributes('aria-label')).toBe('相關商品')
  })

  it('不渲染 section，當沒有任何 related product', () => {
    const wrapper = mountRelatedProductsSection([], '你可能也喜歡')

    expect(wrapper.find('.related-products-section').exists()).toBe(false)
  })
})
