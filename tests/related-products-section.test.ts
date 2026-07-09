// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { onMounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import RelatedProductsSection from '../app/components/related-products-section.vue'
import type { RelatedProductCardView } from '../app/utils/public-content-view-types'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

const NuxtImgStub = {
  props: ['src', 'alt'],
  template: '<img data-component="nuxt-img" :src="src" :alt="alt" />',
}

const UIconStub = { props: ['name'], template: '<i :data-icon="name" />' }

function makeRelatedProduct(overrides: Partial<RelatedProductCardView> = {}): RelatedProductCardView {
  return {
    id: 'product-a',
    name: '商品 A',
    image_url: '/products/images/a.jpg',
    category_label: '電腦',
    channel_label: 'PChome',
    ...overrides,
  }
}

function mountRelatedProductsSection(products: RelatedProductCardView[], title: string) {
  return mount(RelatedProductsSection, {
    props: { products, title },
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
        NuxtImg: NuxtImgStub,
        UIcon: UIconStub,
      },
    },
  })
}

describe('RelatedProductsSection', () => {
  // 元件依賴 Nuxt auto-import 的 ref/onMounted 與 useBrokenImageFallback composable；bare vitest 需 stub。
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('渲染與 products 數量相同的卡片、每張連到 /products/{id}', () => {
    const wrapper = mountRelatedProductsSection([
      makeRelatedProduct({ id: 'product-a', name: '商品 A' }),
      makeRelatedProduct({ id: 'product-b', name: '商品 B' }),
    ], '你可能也喜歡')
    const cards = wrapper.findAll('.related-product-card')
    const hrefs = cards.map((card) => card.attributes('href'))

    expect(cards).toHaveLength(2)
    expect(hrefs).toEqual(['/products/product-a', '/products/product-b'])
  })

  it('顯示每張卡的商品名稱與 category · channel meta', () => {
    const wrapper = mountRelatedProductsSection([
      makeRelatedProduct({ name: '商品 A', category_label: '電腦', channel_label: 'PChome' }),
    ], '你可能也喜歡')

    expect(wrapper.find('.related-product-name').text()).toBe('商品 A')
    expect(wrapper.find('.related-product-meta').text()).toBe('電腦 · PChome')
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

  it('隱藏破圖的卡片圖片並露出 fallback icon，當該圖回報載入失敗', async () => {
    const wrapper = mountRelatedProductsSection([makeRelatedProduct({ id: 'product-a' })], '你可能也喜歡')

    expect(wrapper.find('.related-product-image').exists()).toBe(true)

    await wrapper.find('.related-product-image').trigger('error')

    expect(wrapper.find('.related-product-image').exists()).toBe(false)
    expect(wrapper.find('.related-product-fallback-icon').exists()).toBe(true)
  })
})
