import { renderToString } from '@vue/test-utils'
import { computed, onMounted, ref } from 'vue'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import { useDetailBackNavigation } from '../app/composables/use-detail-back-navigation'
import ProductDetail from '../app/components/product-detail.vue'
import RelatedProductsSection from '../app/components/related-products-section.vue'
import type { ProductDetailView } from '../app/utils/public-content-view-types'

const NuxtLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const NuxtImgStub = { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' }
const CatalogPillStub = { props: ['to', 'variant'], template: '<span><slot /></span>' }
const UButtonStub = { props: ['to', 'icon', 'block', 'size', 'color', 'variant'], template: '<button><slot /></button>' }
const UIconStub = { props: ['name'], template: '<i />' }
// share-buttons 非本 suite 關注點，掛淺 stub 隔離其 useRoute／navigator 依賴。
const ShareButtonsStub = { props: ['title'], template: '<section class="share-section" />' }
const DisqusThreadStub = { props: ['contentType', 'contentId'], template: '<section class="disqus-thread" />' }
const UAlertStub = { props: ['title', 'description', 'color', 'variant'], template: '<div class="dw-alert-stub">{{ title }}<span>{{ description }}</span></div>' }
const ContentMarkdownStub = { props: ['source'], template: '<div />' }

function makeProductDetailView(overrides: Partial<ProductDetailView> = {}): ProductDetailView {
  return {
    id: 'sample-product',
    name: '示範商品',
    short_description: '摘要',
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

function renderProductDetail(detail: ProductDetailView) {
  return renderToString(ProductDetail, {
    props: { detail },
    global: {
      components: { RelatedProductsSection, ShareButtons: ShareButtonsStub, DisqusThread: DisqusThreadStub },
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

describe('product detail hero opinion and layout ordering', () => {
  beforeAll(() => {
    // product-detail.vue 依賴 Nuxt auto-import 的 Vue API；此 bare vitest 環境無 auto-import，需 stub。
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useRouter', () => ({ back: vi.fn(), push: vi.fn() }))
    vi.stubGlobal('useDetailBackNavigation', useDetailBackNavigation)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should render the DW opinion callout with its title and body copy', async () => {
    const html = await renderProductDetail(makeProductDetailView({ long_description: 'DW 觀點內文' }))

    expect(html).toContain('DW 怎麼說')
    expect(html).toContain('DW 觀點內文')
  })

  it('should overlay the back button between the hero tile and hero image', async () => {
    const html = await renderProductDetail(makeProductDetailView())
    const hero_tile_index = html.indexOf('detail-hero-tile')
    const back_button_index = html.indexOf('detail-back')
    const hero_image_index = html.indexOf('detail-hero-image')

    expect(hero_tile_index).toBeGreaterThanOrEqual(0)
    expect(back_button_index).toBeGreaterThan(hero_tile_index)
    expect(back_button_index).toBeLessThan(hero_image_index)
  })

  it('places matching primary purchase calls to action after the price and after AI copy', async () => {
    const detail = makeProductDetailView({
      llm_description: 'AI 觀點說明',
      fine_print: '實際售價以通路頁面為準。',
      reference_links: [{ title: '產品規格', url: 'https://example.com/reference' }],
    })
    const html = await renderProductDetail(detail)
    const hero_layout_index = html.indexOf('detail-hero-layout')
    const hero_tile_index = html.indexOf('detail-hero-tile')
    const summary_column_index = html.indexOf('detail-summary-column')
    const title_index = html.indexOf('detail-title')
    const taxonomy_index = html.indexOf('detail-taxonomy-row')
    const price_index = html.indexOf('detail-price')
    const dw_says_index = html.indexOf('detail-dw-says')
    const upper_cta_index = html.indexOf('product-detail-upper-cta')
    const llm_says_index = html.indexOf('detail-llm-says')
    const purchase_summary_index = html.indexOf('product-purchase-summary')
    const reference_links_index = html.indexOf('detail-reference-links')
    const price_close_index = html.indexOf('</p>', price_index)
    const next_element_after_price = html.slice(price_close_index + '</p>'.length).trimStart()
    const purchase_summary_html = html.slice(purchase_summary_index, html.indexOf('</section>', purchase_summary_index))

    // summary column 內部順序：標題 → 分類列 → 價格 → 主購買 CTA → DW 觀點。
    expect(hero_layout_index).toBeGreaterThanOrEqual(0)
    expect(hero_tile_index).toBeGreaterThan(hero_layout_index)
    expect(summary_column_index).toBeGreaterThan(hero_tile_index)
    expect(title_index).toBeGreaterThan(summary_column_index)
    expect(taxonomy_index).toBeGreaterThan(title_index)
    expect(price_index).toBeGreaterThan(taxonomy_index)
    expect(upper_cta_index).toBeGreaterThan(price_index)
    expect(next_element_after_price).toMatch(/^<a class="product-detail-upper-cta"/)
    expect(dw_says_index).toBeGreaterThan(upper_cta_index)
    // AI copy、語意化購買摘要與參考資料都落在 hero layout 後的全寬區段。
    expect(llm_says_index).toBeGreaterThan(dw_says_index)
    expect(purchase_summary_index).toBeGreaterThan(llm_says_index)
    expect(reference_links_index).toBeGreaterThan(purchase_summary_index)

    const expected_cta_label = '前往 PChome 查看現價'
    const upper_cta_html = html.slice(upper_cta_index, html.indexOf('</a>', upper_cta_index))

    expect(upper_cta_html).toContain(expected_cta_label)
    expect(upper_cta_html).toContain('href="https://example.com/buy"')
    expect(upper_cta_html).toContain('target="_blank"')
    expect(upper_cta_html).toContain('rel="noopener noreferrer"')
    expect(purchase_summary_html).toContain('目前參考價')
    expect(purchase_summary_html).toContain('NT$1,000 · PChome')
    expect(purchase_summary_html).toContain(expected_cta_label)
    expect(purchase_summary_html).toContain('href="https://example.com/buy"')
    expect(purchase_summary_html).toContain('target="_blank"')
    expect(purchase_summary_html).toContain('rel="noopener noreferrer"')
    expect(purchase_summary_html).not.toContain(detail.name)
    expect(purchase_summary_html).not.toContain(detail.fine_print)
    expect(purchase_summary_html).not.toContain('product-purchase-summary-fine-print')
  })

  it('keeps the purchase summary before reference links when AI copy is absent', async () => {
    const html = await renderProductDetail(makeProductDetailView({
      llm_description: '',
      reference_links: [{ title: '產品規格', url: 'https://example.com/reference' }],
    }))

    expect(html.indexOf('detail-llm-says')).toBe(-1)
    expect(html.indexOf('product-purchase-summary')).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('product-purchase-summary')).toBeLessThan(html.indexOf('detail-reference-links'))
  })

  // 價格免責文字是刻意從 Product detail 整頁移除的（spec 非目標），不只是排除在摘要卡外，
  // 故斷言範圍是整份 HTML：payload 仍供應 fine_print，但頁面不得再顯示它或任何 fallback 文案。
  it('does not render fine print anywhere on the product detail page', async () => {
    const detail = makeProductDetailView({
      fine_print: '實際售價以通路頁面為準。',
      reference_links: [{ title: '產品規格', url: 'https://example.com/reference' }],
    })
    const html = await renderProductDetail(detail)

    expect(html).not.toContain(detail.fine_print)
    expect(html).not.toContain('價格與庫存以通路頁面為準。')
    expect(html).not.toContain('detail-fine-print')
    expect(html).not.toContain('product-purchase-summary-fine-print')
  })
})
