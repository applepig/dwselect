// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// srcset 契約以安裝版 @nuxt/image runtime 的 getSizes 實跑（同 product-card-responsive-image.test.ts），
// 把 M3b 擴充 AC「hero 實際下載尺寸對應 .detail-hero-layout 各斷點顯示尺寸」鎖成自動化斷言。
import { resolveSrcset } from './helpers/resolve-srcset'
import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import { useDetailBackNavigation } from '../app/composables/use-detail-back-navigation'
import ProductDetail from '../app/components/product-detail.vue'
import GuideDetail from '../app/components/guide-detail.vue'
import type { GuideDetailView, ProductDetailView } from '../app/utils/public-content-view-types'

// 透傳 stub：把 detail 元件傳給 <NuxtImg> 的響應式與載入屬性原封渲染到 <img>，
// 讓測試能從 render 後 DOM 觀察 hero 對 image 層宣告的顯示尺寸與載入優先序。
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

// 已載入即失敗（SSR/快取）狀態，用於驗證破圖 fallback 不因新屬性而回歸。
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

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}
const CatalogPillStub = { props: ['to', 'variant'], template: '<span class="catalog-pill"><slot /></span>' }
const UButtonStub = { props: ['to', 'icon', 'block', 'size', 'color', 'variant'], template: '<button><slot /></button>' }
const UIconStub = { props: ['name'], template: '<i :data-icon="name" />' }
const UAlertStub = { props: ['title', 'description', 'color', 'variant'], template: '<div />' }
const ContentMarkdownStub = { props: ['source'], template: '<div />' }
const ShareButtonsStub = { props: ['title'], template: '<div />' }
const DisqusThreadStub = { props: ['contentType', 'contentId'], template: '<div />' }
const RelatedProductsSectionStub = { props: ['products', 'title'], template: '<div />' }

const shared_stubs = {
  NuxtLink: NuxtLinkStub,
  CatalogPill: CatalogPillStub,
  UButton: UButtonStub,
  UIcon: UIconStub,
  UAlert: UAlertStub,
  ContentMarkdown: ContentMarkdownStub,
  ShareButtons: ShareButtonsStub,
  DisqusThread: DisqusThreadStub,
  RelatedProductsSection: RelatedProductsSectionStub,
}

function mountProductDetail(detail: ProductDetailView, nuxt_img_stub: unknown = AttrForwardingNuxtImgStub) {
  return mount(ProductDetail, {
    props: { detail },
    global: { stubs: { ...shared_stubs, NuxtImg: nuxt_img_stub } },
  })
}

function mountGuideDetail(detail: GuideDetailView, nuxt_img_stub: unknown = AttrForwardingNuxtImgStub) {
  return mount(GuideDetail, {
    props: { detail },
    global: { stubs: { ...shared_stubs, NuxtImg: nuxt_img_stub } },
  })
}

function makeProductDetailView(overrides: Partial<ProductDetailView> = {}): ProductDetailView {
  return {
    id: 'sample-product',
    name: '示範商品',
    summary: '摘要',
    long_description: '長描述',
    llm_description: '',
    hero_image_url: '/products/images/sample.jpg',
    hero_alt: '示範商品',
    category_id: 'computer-3c',
    category_label: '電腦3C',
    channel_id: 'pchome',
    channel_label: 'PChome',
    tag_ids: [],
    tag_labels: [],
    brand_ids: [],
    brand_labels: [],
    price_label: 'NT$1,000',
    buy_url: 'https://example.com/buy',
    fine_print: '',
    reference_links: [],
    related_products: [],
    ...overrides,
  }
}

function makeGuideDetailView(overrides: Partial<GuideDetailView> = {}): GuideDetailView {
  return {
    id: 'sample-guide',
    title: '示範指南',
    summary: '這是指南摘要。',
    body: '內文',
    hero_image_url: '/guides/images/sample-guide.jpg',
    hero_alt: '示範指南',
    category_ids: [],
    category_labels: [],
    tag_ids: [],
    tag_labels: [],
    brand_ids: [],
    brand_labels: [],
    source_url: 'https://example.com/sample-guide',
    reference_links: [],
    related_products: [],
    ...overrides,
  }
}

// 斷言 hero <NuxtImg> 的響應式尺寸契約：product 與 guide 本地 hero 共用 .detail-hero-layout
// 版型，契約相同——sizes 覆蓋各斷點、候選集有上界又克制、quality 75、webp。
function expectHeroResponsiveContract(hero: { attributes(key?: string): string | undefined }) {
  const sizes = hero.attributes('sizes')
  expect(sizes).toBeTruthy()
  // 版型：<768 單欄 hero≈100vw−70px；768+/1200+ 兩欄 hero≈47.5vw−124px／−194px，
  // shell 無 max-width 封頂 → 桌機顯示寬跟著視窗長，兩個區間都必須用流動（vw）提示。
  const size_hints = (sizes ?? '').trim().split(/\s+/).filter(Boolean)
  expect(size_hints.length).toBeGreaterThan(1)
  expect(sizes).toMatch(/vw/)

  expect(hero.attributes('data-quality')).toBe('75')
  expect(hero.attributes('data-format')).toBe('webp')

  const { widths } = resolveSrcset(sizes ?? '')
  // AC：srcset 為多寬度候選（非單一 1x/2x）。
  expect(widths.length).toBeGreaterThan(1)
  // 需求上界：手機全寬 DPR3（430px 視窗 92vw≈396css×3≈1187）與桌機兩欄 DPR2
  // （1536 視窗 40vw=614css×2=1229）都要有足夠大的候選，避免 retina 欠解析。
  expect(Math.max(...widths)).toBeGreaterThanOrEqual(1200)
  // 候選克制：hero 候選 ≤5，避免近乎等寬候選放大 generate 產物。
  expect(widths.length).toBeLessThanOrEqual(5)
}

describe('詳情頁 hero 響應式圖（M3b 擴充）', () => {
  beforeEach(() => {
    // detail 元件依賴 Nuxt auto-import 的 Vue API 與 composables；bare vitest 需 stub。
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('onUnmounted', onUnmounted)
    vi.stubGlobal('useRoute', () => ({ path: '/products/sample-product' }))
    vi.stubGlobal('useRouter', () => ({ back: vi.fn(), push: vi.fn() }))
    vi.stubGlobal('useDetailBackNavigation', useDetailBackNavigation)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('product hero 宣告對應 .detail-hero-layout 斷點的響應式尺寸，srcset 覆蓋手機 DPR3 與桌機兩欄 DPR2', () => {
    const wrapper = mountProductDetail(makeProductDetailView())
    const hero = wrapper.find('.detail-hero-image')

    expect(hero.exists()).toBe(true)
    expectHeroResponsiveContract(hero)
  })

  it('product hero 是詳情頁 LCP：維持 eager（不宣告 lazy）並帶 fetchpriority=high', () => {
    const wrapper = mountProductDetail(makeProductDetailView())
    const hero = wrapper.find('.detail-hero-image')

    // 未宣告 loading → 瀏覽器預設 eager；不得為 lazy。
    expect(hero.attributes('loading')).toBeUndefined()
    expect(hero.attributes('fetchpriority')).toBe('high')
  })

  it('guide 本地 hero 走 NuxtImg 並宣告與 product hero 相同的響應式尺寸契約與載入優先序', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: '/guides/images/local-hero.jpg' }))
    const hero = wrapper.find('.detail-hero-image')

    expect(hero.attributes('data-component')).toBe('nuxt-img')
    expectHeroResponsiveContract(hero)
    expect(hero.attributes('loading')).toBeUndefined()
    expect(hero.attributes('fetchpriority')).toBe('high')
  })

  it('guide 外部 hero 仍走原生 img，不帶 IPX 響應式屬性（非 IPX 路徑不回歸）', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: 'https://example.com/external-hero.jpg' }))
    const hero = wrapper.find('.detail-hero-image')

    expect(hero.exists()).toBe(true)
    expect(hero.attributes('data-component')).toBeUndefined()
    expect(hero.attributes('src')).toBe('https://example.com/external-hero.jpg')
    // 外部圖不走 IPX，不得沾上 srcset/sizes/fetchpriority 宣告。
    expect(hero.attributes('sizes')).toBeUndefined()
    expect(hero.attributes('srcset')).toBeUndefined()
    expect(hero.attributes('fetchpriority')).toBeUndefined()
  })

  it('product hero 破圖時仍露出 fallback icon，不因新屬性回歸', async () => {
    const wrapper = mountProductDetail(makeProductDetailView(), PreloadedBrokenNuxtImgStub)
    await nextTick()

    expect(wrapper.find('.detail-hero-image').exists()).toBe(false)
    expect(wrapper.find('.detail-image-fallback-icon').exists()).toBe(true)
  })

  // happy-dom 的原生 <img> 掛載時即 complete 且 naturalWidth=0，等同「已載入即失敗」的外部破圖，
  // 由 onMounted 的 scanForBrokenImage 標記；本測試釘的是破圖狀態 → 隱藏 img＋露出 fallback 的 wiring。
  it('guide 外部 hero 破圖時仍隱藏並露出 fallback icon（破圖 fallback 不回歸）', async () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: 'https://example.com/broken.jpg' }))
    await nextTick()

    expect(wrapper.find('.detail-hero-image').exists()).toBe(false)
    expect(wrapper.find('.detail-image-fallback-icon').exists()).toBe(true)
  })
})
