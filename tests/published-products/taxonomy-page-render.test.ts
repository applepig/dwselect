// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'

import TaxonomyPage from '../../app/components/taxonomy-page.vue'
import ResourceList from '../../app/components/resource-list.vue'
import ProductCard from '../../app/components/product-card.vue'
import type { ProductCardView } from '../../app/utils/public-content-view-types'
import type { CompactResourceRow, TaxonomyPageData } from '../../app/utils/published-products/types'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : (to && to.path)"><slot /></a>',
}

const NuxtImgStub = { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' }
const UIconStub = { props: ['name'], template: '<i />' }
const UCardStub = { template: '<div class="u-card"><slot /></div>' }
const CatalogPillStub = { props: ['to', 'variant'], template: '<span class="catalog-pill"><slot /></span>' }

function makeCard(id: string): ProductCardView {
  return {
    id,
    name: `${id} 商品`,
    summary: '短評',
    image_url: '/products/images/x.jpg',
    category_id: 'computer',
    category_label: '電腦',
    channel_id: 'pchome',
    channel_label: 'PChome',
    price_label: 'NT$ 1,990',
    tag_ids: [],
    tag_labels: [],
    published_at: '2026-06-02T00:00:00+08:00',
  }
}

function makeRow(id: string, type: CompactResourceRow['type'], external: boolean): CompactResourceRow {
  return {
    id,
    type,
    title: `${id} 標題`,
    subtitle: '副標',
    meta: null,
    href: external ? `https://example.com/${id}` : `/guide/${id}`,
    image_url: null,
    icon: null,
    external,
    target: external ? '_blank' : null,
    rel: external ? 'noopener noreferrer' : null,
    category_ids: ['computer'],
    tag_ids: [],
  }
}

function makeData(overrides: Partial<TaxonomyPageData> = {}): TaxonomyPageData {
  return {
    taxonomy_kind: 'category',
    id: 'computer',
    label: '電腦',
    description: null,
    products: [makeCard('p-one'), makeCard('p-two')],
    guides: [makeRow('g-one', 'guide', false)],
    links: [makeRow('l-one', 'link', true)],
    ...overrides,
  }
}

function mountTaxonomyPage(data: TaxonomyPageData) {
  return mount(TaxonomyPage, {
    props: { data },
    global: {
      components: { ResourceList, ProductCard },
      stubs: {
        NuxtLink: NuxtLinkStub,
        NuxtImg: NuxtImgStub,
        UIcon: UIconStub,
        UCard: UCardStub,
        CatalogPill: CatalogPillStub,
      },
    },
  })
}

describe('TaxonomyPage render', () => {
  // ResourceList 在 setup 用 Nuxt auto-import 的 ref，此測試環境無 auto-import，需 stub。
  beforeAll(() => {
    vi.stubGlobal('ref', ref)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should not render an in-page H1 title (the layout breadcrumb is the page h1, AC26)', () => {
    const wrapper = mountTaxonomyPage(makeData({ label: '電腦周邊' }))

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.taxonomy-page-title').exists()).toBe(false)
  })

  it('should not render the kind kicker that mislabels brand/channel as 分類 (AC26)', () => {
    const wrapper = mountTaxonomyPage(makeData({ taxonomy_kind: 'channel', id: 'other-channel', label: '其他通路', description: null }))

    expect(wrapper.find('.section-kicker').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('分類')
  })

  it('should render the tag description when present', () => {
    const wrapper = mountTaxonomyPage(makeData({ taxonomy_kind: 'tag', id: 'typing', description: '輸入設備簡介' }))

    expect(wrapper.find('.taxonomy-page-description').text()).toBe('輸入設備簡介')
  })

  it('should not render a description block for a category (no description)', () => {
    const wrapper = mountTaxonomyPage(makeData({ taxonomy_kind: 'category', description: null }))

    expect(wrapper.find('.taxonomy-page-description').exists()).toBe(false)
  })

  it('should render a product grid with one card per product', () => {
    const wrapper = mountTaxonomyPage(makeData({ products: [makeCard('p-one'), makeCard('p-two')] }))

    expect(wrapper.find('.product-grid').exists()).toBe(true)
    expect(wrapper.findAll('.product-card')).toHaveLength(2)
  })

  it('should not render the products section when there are no products', () => {
    const wrapper = mountTaxonomyPage(makeData({ products: [] }))

    expect(wrapper.find('.taxonomy-products-section').exists()).toBe(false)
    expect(wrapper.find('.product-grid').exists()).toBe(false)
  })

  it('should render the guides section with internal guide links', () => {
    const wrapper = mountTaxonomyPage(makeData({ guides: [makeRow('g-one', 'guide', false)] }))
    const guides_section = wrapper.find('.taxonomy-guides-section')

    expect(guides_section.exists()).toBe(true)
    expect(guides_section.find('a').attributes('href')).toBe('/guide/g-one')
  })

  it('should not render the guides section when there are no guides', () => {
    const wrapper = mountTaxonomyPage(makeData({ guides: [] }))

    expect(wrapper.find('.taxonomy-guides-section').exists()).toBe(false)
  })

  it('should render the links section with external link rows opening in a new tab', () => {
    const wrapper = mountTaxonomyPage(makeData({ links: [makeRow('l-one', 'link', true)] }))
    const links_section = wrapper.find('.taxonomy-links-section')
    const external_anchor = links_section.find('a')

    expect(links_section.exists()).toBe(true)
    expect(external_anchor.attributes('href')).toBe('https://example.com/l-one')
    expect(external_anchor.attributes('target')).toBe('_blank')
    expect(external_anchor.attributes('rel')).toBe('noopener noreferrer')
  })

  it('should not render the links section when there are no links', () => {
    const wrapper = mountTaxonomyPage(makeData({ links: [] }))

    expect(wrapper.find('.taxonomy-links-section').exists()).toBe(false)
  })
})
