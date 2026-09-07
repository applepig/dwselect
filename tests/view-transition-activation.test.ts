// @vitest-environment happy-dom

import { mount, type VueWrapper } from '@vue/test-utils'
import { onMounted, readonly, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useActiveViewTransitionProduct } from '../app/composables/use-active-view-transition-product'
import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import ProductCard from '../app/components/product-card.vue'
import type { ProductCardView } from '../app/utils/public-content-view-types'
import { createUseStateStub } from './helpers/create-use-state-stub'

// 啟用互動（點卡片後才掛 view-transition-name）需要 DOM 事件，故獨立於 view-transition.test.ts
// （該檔 import nuxt.config，happy-dom 覆寫的 URL 不支援 file: scheme，無法共用環境）。

// 卡片上 6 個會掛 view-transition-name 的部件（card/image/title/summary/price/channel）。
const CARD_PART_CLASSES = [
  'product-vt-card',
  'product-vt-image',
  'product-vt-title',
  'product-vt-summary',
  'product-vt-price',
  'product-vt-channel',
]

const NuxtLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const NuxtImgStub = { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' }
const CatalogPillStub = { props: ['to', 'variant'], template: '<span><slot /></span>' }
const UCardStub = { props: ['ui'], template: '<div class="product-card-stub"><slot /></div>' }

function makeProductCardView(overrides: Partial<ProductCardView> = {}): ProductCardView {
  return {
    id: 'sample-product',
    name: '示範商品',
    short_description: '摘要',
    image_url: '/products/images/sample.jpg',
    category_id: 'computer-3c',
    category_label: '電腦3C',
    channel_id: 'pchome',
    channel_ids: ['pchome'],
    channel_label: 'PChome',
    price_label: 'NT$1,000',
    tag_ids: [],
    tag_labels: [],
    published_at: null,
    ...overrides,
  }
}

function mountProductCard(product: ProductCardView) {
  return mount(ProductCard, {
    props: { product },
    global: {
      stubs: {
        UCard: UCardStub,
        NuxtLink: NuxtLinkStub,
        NuxtImg: NuxtImgStub,
        CatalogPill: CatalogPillStub,
      },
    },
  })
}

// happy-dom 的 CSSStyleDeclaration 缺瀏覽器已有的 viewTransitionName 屬性，Vue 找不到對應屬性時會把值掛成
// 物件 expando、不進 CSSOM 也不反映到 style attribute，且 Vue 撤掉 style（removeAttribute）後 expando 仍殘留，
// 會讓「name 已移除」誤判成仍在。補上與瀏覽器同語意的 accessor，讓 Vue 走正規 setProperty 路徑，
// 之後讀 getPropertyValue 就是瀏覽器行為。
Object.defineProperty(CSSStyleDeclaration.prototype, 'viewTransitionName', {
  configurable: true,
  get() {
    return this.getPropertyValue('view-transition-name')
  },
  set(value: string) {
    this.setProperty('view-transition-name', value)
  },
})

function getMountedViewTransitionName(wrapper: VueWrapper, css_class: string): string | undefined {
  const value = (wrapper.find(`.${css_class}`).element as HTMLElement).style.getPropertyValue('view-transition-name')

  return value === '' ? undefined : value
}

function expectCardUnnamed(wrapper: VueWrapper) {
  for (const css_class of CARD_PART_CLASSES) {
    expect(getMountedViewTransitionName(wrapper, css_class), css_class).toBeUndefined()
  }
}

describe('product card view-transition-name 啟用互動（AC2）', () => {
  beforeEach(() => {
    // ProductCard 依賴 Nuxt auto-import 的 Vue API 與 composable；bare vitest 需 stub。
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('readonly', readonly)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
    // active 商品狀態跨卡片共享，每個 test 給一份全新的 useState 存放區，避免前一個 test 的啟用外洩。
    vi.stubGlobal('useState', createUseStateStub())
    vi.stubGlobal('useActiveViewTransitionProduct', useActiveViewTransitionProduct)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should name all six card parts only after the detail link is clicked, leaving sibling cards un-named', async () => {
    const alpha = mountProductCard(makeProductCardView({ id: 'alpha' }))
    const beta = mountProductCard(makeProductCardView({ id: 'beta' }))

    expectCardUnnamed(alpha)

    await alpha.find('.product-card-link').trigger('click')

    expect(getMountedViewTransitionName(alpha, 'product-vt-card')).toBe('product-card-alpha')
    expect(getMountedViewTransitionName(alpha, 'product-vt-image')).toBe('product-image-alpha')
    expect(getMountedViewTransitionName(alpha, 'product-vt-title')).toBe('product-title-alpha')
    expect(getMountedViewTransitionName(alpha, 'product-vt-summary')).toBe('product-summary-alpha')
    expect(getMountedViewTransitionName(alpha, 'product-vt-price')).toBe('product-price-alpha')
    expect(getMountedViewTransitionName(alpha, 'product-vt-channel')).toBe('product-channel-alpha')
    expectCardUnnamed(beta)
  })

  it('should activate the card when the click lands on content nested inside the detail link (e.g. the title)', async () => {
    const wrapper = mountProductCard(makeProductCardView({ id: 'alpha' }))

    await wrapper.find('.product-vt-title').trigger('click')

    expect(getMountedViewTransitionName(wrapper, 'product-vt-card')).toBe('product-card-alpha')
  })

  it('should not activate the card when the channel pill (a list → list link) is clicked', async () => {
    // channel pill 導向 /channel/*，是列表↔列表換頁；若啟用，該卡會在兩個列表間單獨滑動、其他卡 fade，
    // 與 045 接受的「列表↔列表隨 root fade」不一致，故只有通往詳情頁的連結才啟用。
    const wrapper = mountProductCard(makeProductCardView({ id: 'alpha' }))

    await wrapper.find('.channel-badge').trigger('click')

    expectCardUnnamed(wrapper)
  })

  it('should move the name to the newly clicked card so exactly one product is named at a time', async () => {
    const alpha = mountProductCard(makeProductCardView({ id: 'alpha' }))
    const beta = mountProductCard(makeProductCardView({ id: 'beta' }))

    await alpha.find('.product-card-link').trigger('click')
    await beta.find('.product-card-link').trigger('click')

    expectCardUnnamed(alpha)
    expect(getMountedViewTransitionName(beta, 'product-vt-card')).toBe('product-card-beta')
  })
})
