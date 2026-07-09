// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { computed, onMounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import { useDetailBackNavigation } from '../app/composables/use-detail-back-navigation'
import ProductDetail from '../app/components/product-detail.vue'
import RelatedProductsSection from '../app/components/related-products-section.vue'
import type { ProductDetailView } from '../app/utils/public-content-view-types'

// CatalogPill 以 NuxtLink 渲染，stub 後把 `to`（{ path, query }）序列化到 href 上方便斷言。
const CatalogPillStub = {
  props: ['to', 'variant'],
  template: '<a class="catalog-pill" :href="serializeTo(to)"><slot /></a>',
  methods: {
    serializeTo(to: unknown) {
      if (typeof to === 'string') {
        return to
      }

      const target = to as { path: string, query?: Record<string, string> }
      const query = target.query ?? {}
      const query_string = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&')

      return query_string ? `${target.path}?${query_string}` : target.path
    },
  },
}

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

const NuxtImgStub = { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' }
const UButtonStub = { props: ['to', 'icon', 'block', 'size', 'color', 'variant'], template: '<button><slot /></button>' }
const UIconStub = { props: ['name'], template: '<i />' }
const UAlertStub = { props: ['title', 'description', 'color', 'variant'], template: '<div />' }
const ContentMarkdownStub = { props: ['source'], template: '<div />' }

function mountProductDetail(detail: ProductDetailView) {
  return mount(ProductDetail, {
    props: { detail },
    global: {
      components: { RelatedProductsSection },
      stubs: {
        NuxtLink: NuxtLinkStub,
        CatalogPill: CatalogPillStub,
        NuxtImg: NuxtImgStub,
        UButton: UButtonStub,
        UIcon: UIconStub,
        UAlert: UAlertStub,
        ContentMarkdown: ContentMarkdownStub,
      },
    },
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
    tag_ids: ['ergonomic', 'wireless'],
    tag_labels: ['人體工學', '無線'],
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

describe('ProductDetail taxonomy pill routing', () => {
  beforeEach(() => {
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

  it('should route the category pill to /category/{category_id}', () => {
    const wrapper = mountProductDetail(makeProductDetailView({ category_id: 'home-living', category_label: '居家生活' }))
    const category_pill = wrapper.findAll('.catalog-pill').find((pill) => pill.text() === '居家生活')

    expect(category_pill).toBeTruthy()
    expect(category_pill?.attributes('href')).toBe('/category/home-living')
  })

  it('should route each tag pill to /tag/{tag_id} while displaying the matching tag label', () => {
    const wrapper = mountProductDetail(makeProductDetailView({
      tag_ids: ['ergonomic', 'wireless'],
      tag_labels: ['人體工學', '無線'],
    }))
    const pills_by_label = new Map(wrapper.findAll('.catalog-pill').map((pill) => [pill.text(), pill.attributes('href')]))

    // 配對正確性：label 顯示文字必須連到對應 index 的 tag id，不可錯位。
    expect(pills_by_label.get('人體工學')).toBe('/tag/ergonomic')
    expect(pills_by_label.get('無線')).toBe('/tag/wireless')
  })

  it('should route each brand pill to /brand/{brand_id} while displaying the matching label', () => {
    const wrapper = mountProductDetail(makeProductDetailView({
      brand_ids: ['panasonic'],
      brand_labels: ['Panasonic'],
    }))
    const brand_pill = wrapper.findAll('.catalog-pill').find((pill) => pill.text() === 'Panasonic')

    expect(brand_pill?.attributes('href')).toBe('/brand/panasonic')
  })

  it('should never render a brand id as a dead /tag/{brand} link', () => {
    const wrapper = mountProductDetail(makeProductDetailView({
      tag_ids: ['ergonomic'],
      tag_labels: ['人體工學'],
      brand_ids: ['panasonic'],
      brand_labels: ['Panasonic'],
    }))
    const hrefs = wrapper.findAll('.catalog-pill').map((pill) => pill.attributes('href'))

    expect(hrefs).not.toContain('/tag/panasonic')
    expect(hrefs).toContain('/brand/panasonic')
  })

  it('should deep-link the channel pill to /channel/{channel_id} instead of running a text search (AC24)', () => {
    const wrapper = mountProductDetail(makeProductDetailView({ channel_id: 'momo', channel_label: 'momo' }))
    const channel_pill = wrapper.findAll('.catalog-pill').find((pill) => pill.text() === 'momo')

    expect(channel_pill?.attributes('href')).toBe('/channel/momo')
  })

  it('should render reference links as external resources when product detail has reference links', () => {
    const wrapper = mountProductDetail(makeProductDetailView({
      reference_links: [
        { title: 'PChome 24h 商品頁', url: 'https://24h.pchome.com.tw/prod/DIBMWM-A900HO8OQ' },
        { title: '台灣虎航行李規定', url: 'https://www.tigerairtw.com/zh-TW/welcome-on-board/baggage' },
      ],
    }))
    const section = wrapper.find('[aria-labelledby="detail-reference-links-title"]')
    const links = section.findAll('a.detail-reference-link')

    expect(section.text()).toContain('參考資料')
    expect(links.map((link) => link.text())).toEqual(['PChome 24h 商品頁', '台灣虎航行李規定'])
    expect(links[0]?.attributes('href')).toBe('https://24h.pchome.com.tw/prod/DIBMWM-A900HO8OQ')
    expect(links[0]?.attributes('target')).toBe('_blank')
    expect(links[0]?.attributes('rel')).toBe('noopener noreferrer')
  })

  it('should not render reference links section when product detail has no reference links', () => {
    const wrapper = mountProductDetail(makeProductDetailView({ reference_links: [] }))

    expect(wrapper.find('[aria-labelledby="detail-reference-links-title"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('參考資料')
  })
})

describe('ProductDetail related products section', () => {
  beforeEach(() => {
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

  it('should render the "You may also like" related section with one card per related product linking to its detail', () => {
    const wrapper = mountProductDetail(makeProductDetailView({
      related_products: [
        { id: 'product-a', name: '商品 A', image_url: '/products/images/a.jpg', category_label: '電腦', channel_label: 'PChome' },
        { id: 'product-b', name: '商品 B', image_url: '/products/images/b.jpg', category_label: '居家', channel_label: 'momo' },
      ],
    }))
    const related_section = wrapper.find('.related-products-section')
    const cards = related_section.findAll('.related-product-card')

    expect(related_section.attributes('aria-label')).toBe('You may also like')
    expect(wrapper.find('.related-products-title').text()).toBe('You may also like')
    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.attributes('href'))).toEqual(['/products/product-a', '/products/product-b'])
  })

  it('should not render the related products section when there are no related products', () => {
    const wrapper = mountProductDetail(makeProductDetailView({ related_products: [] }))

    expect(wrapper.find('.related-products-section').exists()).toBe(false)
  })
})
