// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { computed, onMounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import ProductDetail from '../app/components/product-detail.vue'
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
})
