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
const UAlertStub = { props: ['title', 'description', 'color', 'variant'], template: '<div class="dw-alert-stub">{{ title }}<span>{{ description }}</span></div>' }
const ContentMarkdownStub = { props: ['source'], template: '<div />' }

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

function renderProductDetail(detail: ProductDetailView) {
  return renderToString(ProductDetail, {
    props: { detail },
    global: {
      components: { RelatedProductsSection },
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

  it('should keep AI copy and purchase actions below the desktop hero layout', async () => {
    const html = await renderProductDetail(makeProductDetailView({ llm_description: 'AI 觀點說明' }))
    const hero_layout_index = html.indexOf('detail-hero-layout')
    const hero_tile_index = html.indexOf('detail-hero-tile')
    const summary_column_index = html.indexOf('detail-summary-column')
    const title_index = html.indexOf('detail-title')
    const taxonomy_index = html.indexOf('detail-taxonomy-row')
    const price_index = html.indexOf('detail-price')
    const dw_says_index = html.indexOf('detail-dw-says')
    const summary_buy_link_index = html.indexOf('detail-summary-buy-link')
    const llm_says_index = html.indexOf('detail-llm-says')
    const buy_cta_index = html.indexOf('detail-buy-cta')
    const fine_print_index = html.indexOf('detail-fine-print')

    // summary column 內部順序：標題 → 分類列 → 價格 → DW 觀點 → 購買連結。
    expect(hero_layout_index).toBeGreaterThanOrEqual(0)
    expect(hero_tile_index).toBeGreaterThan(hero_layout_index)
    expect(summary_column_index).toBeGreaterThan(hero_tile_index)
    expect(title_index).toBeGreaterThan(summary_column_index)
    expect(taxonomy_index).toBeGreaterThan(title_index)
    expect(price_index).toBeGreaterThan(taxonomy_index)
    expect(dw_says_index).toBeGreaterThan(price_index)
    expect(summary_buy_link_index).toBeGreaterThan(dw_says_index)
    // AI copy 與購買動作、細則落在 hero layout 之後的全寬區段。
    expect(llm_says_index).toBeGreaterThan(summary_buy_link_index)
    expect(buy_cta_index).toBeGreaterThan(llm_says_index)
    expect(fine_print_index).toBeGreaterThan(buy_cta_index)
  })
})
