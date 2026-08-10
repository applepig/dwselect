// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// srcset 契約以安裝版 @nuxt/image runtime 的 getSizes 實跑（見 resolveSrcset），把 AC「srcset 含
// 多個依 sizes 換算的寬度候選」與候選集上下界（覆蓋 DPR2–3 手機 / 不過度密集）鎖成自動化斷言，
// 而非靠不存在的 generate gate 或口頭約定；最終烤製產物另以 M3 人工 throttled/Lighthouse 複驗。
import { resolveSrcset } from './helpers/resolve-srcset'
import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import ProductCard from '../app/components/product-card.vue'
import type { ProductCardView } from '../app/utils/public-content-view-types'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

// 透傳 stub：把 ProductCard 傳給 <NuxtImg> 的響應式與載入屬性原封渲染到 <img>，
// 讓測試能從 render 後 DOM 觀察 ProductCard 對 image 層宣告的顯示尺寸與載入優先序。
const AttrForwardingNuxtImgStub = defineComponent({
  name: 'NuxtImg',
  inheritAttrs: false,
  props: ['src', 'alt', 'sizes', 'quality', 'format', 'loading', 'fetchpriority', 'densities', 'width', 'height'],
  setup(props, { attrs }) {
    return () => h('img', {
      ...attrs,
      'data-component': 'nuxt-img',
      src: props.src,
      alt: props.alt,
      sizes: props.sizes,
      'data-quality': props.quality,
      'data-format': props.format,
      loading: props.loading,
      fetchpriority: props.fetchpriority,
    })
  },
})

// 已載入即失敗（SSR/快取）狀態，用於驗證 fallback 不因新屬性而回歸。
const PreloadedBrokenNuxtImgStub = defineComponent({
  name: 'NuxtImg',
  inheritAttrs: false,
  props: ['src', 'alt', 'sizes', 'quality', 'format', 'loading', 'fetchpriority'],
  setup(props, { attrs }) {
    return () => h('img', { ...attrs, src: props.src, alt: props.alt })
  },
  mounted() {
    Object.defineProperty(this.$el, 'complete', { value: true })
    Object.defineProperty(this.$el, 'naturalWidth', { value: 0 })
  },
})

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

function mountProductCard(
  props: { product: ProductCardView, eager?: boolean, high_priority?: boolean, sizes?: string },
  nuxt_img_stub: unknown = AttrForwardingNuxtImgStub,
) {
  return mount(ProductCard, {
    props,
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

describe('ProductCard 響應式卡圖與首屏載入', () => {
  // ProductCard 依賴 Nuxt auto-import 的 ref/onMounted 與 useBrokenImageFallback；bare vitest 需 stub。
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('宣告手機流動（vw）＋桌機固定（px）的響應式尺寸與壓縮品質，讓 image 層依顯示寬度取縮圖', () => {
    const wrapper = mountProductCard({ product: makeProductCardView() })
    const img = wrapper.find('.product-image')

    const sizes = img.attributes('sizes')
    expect(sizes).toBeTruthy()
    // 設計：.product-grid 桌機 auto-fill 欄寬近定值 → 桌機宣告固定 px、手機單欄用 vw；
    // 因此 sizes 須同時含流動（vw）與固定（px）提示，且不只單一斷點。
    const size_hints = (sizes ?? '').trim().split(/\s+/).filter(Boolean)
    expect(size_hints.length).toBeGreaterThan(1)
    expect(sizes).toMatch(/vw/)
    expect(sizes).toMatch(/\d+px/)

    expect(img.attributes('data-quality')).toBeTruthy()
    expect(img.attributes('data-format')).toBe('webp')
  })

  it('宣告的 sizes 經 @nuxt/image 換算出多寬度 srcset：覆蓋 DPR2–3 手機首屏、且候選不過度密集', () => {
    const wrapper = mountProductCard({ product: makeProductCardView() })
    const sizes = wrapper.find('.product-image').attributes('sizes') ?? ''

    const { widths } = resolveSrcset(sizes)

    // AC：srcset 為多寬度候選（非單一 1x/2x）。
    expect(widths.length).toBeGreaterThan(1)
    // 首屏 LCP 卡圖：手機單欄近全寬（92vw），DPR2–3 需 ~700–1100 device px，最大候選須夠大避免放大糊。
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(800)
    // 候選收斂：不回到「每張圖 10 個近乎等寬變體」的過度密集狀態（generate 產物與編碼成本放大）。
    expect(widths.length).toBeLessThanOrEqual(6)
  })

  it('首屏卡（eager）以 eager 載入', () => {
    const wrapper = mountProductCard({ product: makeProductCardView(), eager: true })
    const img = wrapper.find('.product-image')

    expect(img.attributes('loading')).toBe('eager')
  })

  it('LCP 候選卡（high_priority）帶 fetchpriority=high', () => {
    const wrapper = mountProductCard({ product: makeProductCardView(), high_priority: true })
    const img = wrapper.find('.product-image')

    expect(img.attributes('fetchpriority')).toBe('high')
  })

  it('eager 但非 high_priority 的卡：eager 載入但不搶抓取優先序（避免多張 high 稀釋頻寬）', () => {
    const wrapper = mountProductCard({ product: makeProductCardView(), eager: true, high_priority: false })
    const img = wrapper.find('.product-image')

    expect(img.attributes('loading')).toBe('eager')
    expect(img.attributes('fetchpriority')).toBeUndefined()
  })

  it('預設（未給 eager/high_priority）維持 lazy 載入且不搶抓取優先序', () => {
    const wrapper = mountProductCard({ product: makeProductCardView() })
    const img = wrapper.find('.product-image')

    expect(img.attributes('loading')).toBe('lazy')
    expect(img.attributes('fetchpriority')).toBeUndefined()
  })

  it('明確 eager=false 亦維持 lazy 載入', () => {
    const wrapper = mountProductCard({ product: makeProductCardView(), eager: false })
    const img = wrapper.find('.product-image')

    expect(img.attributes('loading')).toBe('lazy')
  })

  it('sizes 可被使用處覆蓋（related-products 縮圖版型的擴充點）', () => {
    const override = '720:96px 743:30vw 1600:30vw'
    const wrapper = mountProductCard({ product: makeProductCardView(), sizes: override })
    const img = wrapper.find('.product-image')

    expect(img.attributes('sizes')).toBe(override)
  })

  it('首屏卡（high_priority）破圖時仍露出 fallback icon，不因新屬性回歸', async () => {
    const wrapper = mountProductCard(
      { product: makeProductCardView(), eager: true, high_priority: true },
      PreloadedBrokenNuxtImgStub,
    )
    await nextTick()

    expect(wrapper.find('.product-image').exists()).toBe(false)
    expect(wrapper.find('.product-image-fallback-icon').exists()).toBe(true)
  })
})
