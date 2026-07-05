import { renderToString } from '@vue/test-utils'
import { computed, onMounted, ref } from 'vue'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import nuxt_config from '../nuxt.config'
import ProductCard from '../app/components/product-card.vue'
import ProductDetail from '../app/components/product-detail.vue'
import type { ProductCardView, ProductDetailView } from '../app/utils/public-content-view-types'

// renderToString 把 inline style 直接序列化成字串（不經 happy-dom CSSOM，後者會丟棄 view-transition-name），
// 因此能驗收「product id 流入 view-transition-name」這條 morph 契約。讀的是 render 後 markup，
// 非 .vue source 檔，符合 AC5a（不得用讀 Vue source 的 toContain 假斷言）。
function getInlineViewTransitionName(html: string, css_class: string): string | undefined {
  // class 比對錨定到 class 屬性內的「空白／引號」token 邊界：'-' 也是 \b word boundary，
  // 純 \bproduct-card\b 會誤命中 product-card-link／product-card-stub。改以前後接 class 值內的
  // 引號或空白（lookbehind/lookahead）框出完整 token，讓 product-card 只命中獨立的 product-card。
  const tag = html.match(new RegExp(`<[^>]*\\bclass="[^"]*(?<=["\\s])${css_class}(?=["\\s])[^"]*"[^>]*>`))
  const name = tag?.[0].match(/view-transition-name:\s*([^;"]+)/)

  return name?.[1]?.trim()
}

const NuxtLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const NuxtImgStub = { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' }
const CatalogPillStub = { props: ['to', 'variant'], template: '<span><slot /></span>' }
const UCardStub = { props: ['ui'], template: '<div class="product-card-stub" v-bind="$attrs"><slot /></div>' }
const UButtonStub = { props: ['to', 'icon', 'block', 'size', 'color', 'variant'], template: '<button><slot /></button>' }
const UIconStub = { props: ['name'], template: '<i />' }
const UAlertStub = { props: ['title', 'description', 'color', 'variant'], template: '<div />' }
const ContentMarkdownStub = { props: ['source'], template: '<div />' }

function makeProductCardView(overrides: Partial<ProductCardView> = {}): ProductCardView {
  return {
    id: 'sample-product',
    name: '示範商品',
    summary: '摘要',
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

function renderProductCard(product: ProductCardView) {
  return renderToString(ProductCard, {
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

function renderProductDetail(detail: ProductDetailView) {
  return renderToString(ProductDetail, {
    props: { detail },
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
        NuxtImg: NuxtImgStub,
        CatalogPill: CatalogPillStub,
        UButton: UButtonStub,
        UIcon: UIconStub,
        UAlert: UAlertStub,
        ContentMarkdown: ContentMarkdownStub,
      },
    },
  })
}

describe('view transition flag single source of truth (nuxt.config)', () => {
  it('should temporarily enable Nuxt experimental view transitions for the M3 iPad Safari spike', () => {
    // M3 只準備 spike：暫時翻回 true 讓使用者做實機 iPad Safari 驗證。
    // AC10 尚未 PASS 前不得宣稱可 ship；若 FAIL 或未驗證，merge／上線前必須 revert/維持 false。
    expect(nuxt_config.experimental?.viewTransition).toBe(true)
  })

  it('should bind appConfig.enableViewTransition to the same value as experimental.viewTransition (AC2)', () => {
    // SSOT：兩者同步自同一個 module-level 常數，client middleware 只讀 appConfig flag。
    // 改用 appConfig 而非 runtimeConfig.public，是因後者會被 NUXT_PUBLIC_* env 單邊覆寫、
    // 與 build-time only 的 experimental 不對稱；appConfig 非 env-overridable，真正同源。
    // revert 時若只改一處、另一處遺漏，此斷言會紅——這正是避免 flag drift 的點。
    expect(nuxt_config.appConfig?.enableViewTransition).toBe(nuxt_config.experimental?.viewTransition)
  })
})

describe('shared view-transition-name naming (rendered markup, AC3/AC5a)', () => {
  beforeAll(() => {
    // product-detail.vue 依賴 Nuxt auto-import 的 Vue API；此 bare vitest 環境無 auto-import，需 stub。
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useRouter', () => ({ back: vi.fn(), push: vi.fn() }))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should share the product image tile name across card and detail so the image moves inside the expanding card', async () => {
    const [card_html, detail_html] = await Promise.all([
      renderProductCard(makeProductCardView({ id: 'alpha' })),
      renderProductDetail(makeProductDetailView({ id: 'alpha' })),
    ])

    expect(getInlineViewTransitionName(card_html, 'product-image-tile')).toBe('product-image-alpha')
    expect(getInlineViewTransitionName(detail_html, 'detail-hero-tile')).toBe('product-image-alpha')
  })

  it('should share title, summary and price names across card and detail', async () => {
    const [card_html, detail_html] = await Promise.all([
      renderProductCard(makeProductCardView({ id: 'alpha' })),
      renderProductDetail(makeProductDetailView({ id: 'alpha' })),
    ])

    expect(getInlineViewTransitionName(card_html, 'product-name')).toBe('product-title-alpha')
    expect(getInlineViewTransitionName(detail_html, 'detail-title')).toBe('product-title-alpha')
    expect(getInlineViewTransitionName(card_html, 'product-summary')).toBe('product-summary-alpha')
    expect(getInlineViewTransitionName(detail_html, 'detail-dw-says')).toBe('product-summary-alpha')
    expect(getInlineViewTransitionName(card_html, 'product-card-price')).toBe('product-price-alpha')
    expect(getInlineViewTransitionName(detail_html, 'detail-price')).toBe('product-price-alpha')
  })

  it('should keep the card shell name separate from nested shared element names', async () => {
    const html = await renderProductCard(makeProductCardView({ id: 'alpha' }))

    expect(getInlineViewTransitionName(html, 'product-vt-card')).toBe('product-card-alpha')
    expect(getInlineViewTransitionName(html, 'product-image-tile')).toBe('product-image-alpha')
  })

  it('should share an identical product shell view-transition-name across card and detail for the same product', async () => {
    const [card_html, detail_html] = await Promise.all([
      renderProductCard(makeProductCardView({ id: 'beta' })),
      renderProductDetail(makeProductDetailView({ id: 'beta' })),
    ])
    const card_name = getInlineViewTransitionName(card_html, 'product-vt-card')
    const detail_name = getInlineViewTransitionName(detail_html, 'product-vt-card')

    expect(card_name).toBe(detail_name)
    expect(card_name).toBe('product-card-beta')
  })

  it('should keep the product card root un-named so child shared elements are not nested inside a named parent', async () => {
    const html = await renderProductCard(makeProductCardView({ id: 'gamma' }))

    expect(getInlineViewTransitionName(html, 'product-card')).toBeUndefined()
  })

  it('should keep the product detail page root un-named so child shared elements are not nested inside a named parent', async () => {
    const html = await renderProductDetail(makeProductDetailView({ id: 'gamma' }))

    expect(getInlineViewTransitionName(html, 'product-detail-page')).toBeUndefined()
  })

  it('should match only the exact class token, not a hyphenated sibling like product-card-link', () => {
    // helper 的錨定回歸測試（Issue #3）：product-card-link 先出現且帶不同 view-transition-name，
    // 查 product-card 不得被它命中（舊 \b 邊界會誤取 wrong-link）。
    const html = [
      '<a class="product-card-link" style="view-transition-name: wrong-link;">x</a>',
      '<div class="product-card-stub product-card" style="view-transition-name: product-card-gamma;">y</div>',
    ].join('')

    expect(getInlineViewTransitionName(html, 'product-card')).toBe('product-card-gamma')
  })
})
