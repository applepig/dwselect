// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { nextTick, onMounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import ProductCard from '../app/components/product-card.vue'
import type { ProductCardView } from '../app/utils/public-content-view-types'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

// happy-dom 不真的載圖（img 預設 complete=true、naturalWidth=0，恰與「已載入即失敗」同形），
// 故兩個 stub 都在掛載時明確覆寫唯讀屬性，分別重現「已成功載入」與「SSR 已載入即失敗」兩種狀態。
const LoadedNuxtImgStub = {
  props: ['src', 'alt'],
  template: '<img data-component="nuxt-img" :src="src" :alt="alt" />',
  mounted() {
    Object.defineProperty(this.$el, 'complete', { value: true })
    Object.defineProperty(this.$el, 'naturalWidth', { value: 800 })
  },
}

// SSR／快取已載入即失敗的圖：掛載當下 complete 但 naturalWidth 為 0，其 @error 不會再觸發。
const PreloadedBrokenNuxtImgStub = {
  props: ['src', 'alt'],
  template: '<img :src="src" :alt="alt" />',
  mounted() {
    Object.defineProperty(this.$el, 'complete', { value: true })
    Object.defineProperty(this.$el, 'naturalWidth', { value: 0 })
  },
}

const UIconStub = { props: ['name'], template: '<i :data-icon="name" />' }
const UCardStub = { props: ['ui'], template: '<div><slot /></div>' }
const CatalogPillStub = { props: ['to', 'variant'], template: '<span class="catalog-pill"><slot /></span>' }

function makeProductCardView(overrides: Partial<ProductCardView> = {}): ProductCardView {
  return {
    id: 'sample-product',
    name: '示範商品',
    short_description: '推薦短評',
    image_url: '/products/images/sample.jpg',
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

function mountProductCard(product: ProductCardView, nuxt_img_stub = LoadedNuxtImgStub) {
  return mount(ProductCard, {
    props: { product },
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
        NuxtImg: nuxt_img_stub,
        UIcon: UIconStub,
        UCard: UCardStub,
        CatalogPill: CatalogPillStub,
      },
    },
  })
}

describe('ProductCard 破圖 fallback', () => {
  // ProductCard 依賴 Nuxt auto-import 的 ref/onMounted 與 useBrokenImageFallback composable；bare vitest 需 stub。
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('隱藏卡片圖並露出 fallback icon，當圖片回報載入失敗', async () => {
    const wrapper = mountProductCard(makeProductCardView())

    expect(wrapper.find('.product-image').exists()).toBe(true)
    expect(wrapper.find('.product-image-fallback-icon').exists()).toBe(false)

    await wrapper.find('.product-image').trigger('error')

    expect(wrapper.find('.product-image').exists()).toBe(false)
    expect(wrapper.find('.product-image-fallback-icon').exists()).toBe(true)
  })

  it('掛載後補偵測 SSR 已載入即失敗的圖並改示 fallback icon', async () => {
    const wrapper = mountProductCard(makeProductCardView(), PreloadedBrokenNuxtImgStub)
    await nextTick()

    expect(wrapper.find('.product-image').exists()).toBe(false)
    expect(wrapper.find('.product-image-fallback-icon').exists()).toBe(true)
  })

  it('維持圖片顯示、不露出 fallback icon，當圖片未回報失敗', async () => {
    const wrapper = mountProductCard(makeProductCardView())
    await nextTick()

    expect(wrapper.find('.product-image').exists()).toBe(true)
    expect(wrapper.find('.product-image-fallback-icon').exists()).toBe(false)
  })
})
