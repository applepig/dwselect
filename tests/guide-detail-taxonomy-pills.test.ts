// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import GuideDetail from '../app/components/guide-detail.vue'
import ContentMarkdown from '../app/components/content-markdown.vue'
import type { GuideDetailView } from '../app/utils/public-content-view-types'

// CatalogPill stub 把 `to`（{ path, query }）序列化到 href 上方便斷言導向目標。
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

function mountGuideDetail(detail: GuideDetailView) {
  return mount(GuideDetail, {
    props: { detail },
    global: {
      components: { ContentMarkdown },
      stubs: {
        NuxtLink: NuxtLinkStub,
        CatalogPill: CatalogPillStub,
        NuxtImg: NuxtImgStub,
        UButton: UButtonStub,
        UIcon: UIconStub,
      },
    },
  })
}

function makeGuideDetailView(overrides: Partial<GuideDetailView> = {}): GuideDetailView {
  return {
    id: 'sample-guide',
    title: '示範指南',
    summary: '這是指南摘要。',
    body: '',
    hero_image_url: '',
    hero_alt: '示範指南',
    category_ids: ['computer'],
    category_labels: ['電腦'],
    tag_ids: ['typing'],
    tag_labels: ['輸入'],
    brand_ids: [],
    brand_labels: [],
    source_url: 'https://example.com/sample-guide',
    related_products: [],
    ...overrides,
  }
}

describe('GuideDetail taxonomy pill routing', () => {
  beforeEach(() => {
    vi.stubGlobal('useRouter', () => ({ back: vi.fn(), push: vi.fn() }))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should route each category pill to /category/{category_id} while displaying the matching label', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      category_ids: ['computer', 'home-living'],
      category_labels: ['電腦', '居家生活'],
    }))
    const pills_by_label = new Map(wrapper.findAll('.catalog-pill').map((pill) => [pill.text(), pill.attributes('href')]))

    expect(pills_by_label.get('電腦')).toBe('/category/computer')
    expect(pills_by_label.get('居家生活')).toBe('/category/home-living')
  })

  it('should route each tag pill to /tag/{tag_id} while displaying the matching label', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      tag_ids: ['typing', 'wireless'],
      tag_labels: ['輸入', '無線'],
    }))
    const pills_by_label = new Map(wrapper.findAll('.catalog-pill').map((pill) => [pill.text(), pill.attributes('href')]))

    expect(pills_by_label.get('輸入')).toBe('/tag/typing')
    expect(pills_by_label.get('無線')).toBe('/tag/wireless')
  })

  it('should route each brand pill to /brand/{brand_id} while displaying the matching label', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      brand_ids: ['panasonic'],
      brand_labels: ['Panasonic'],
    }))
    const pills_by_label = new Map(wrapper.findAll('.catalog-pill').map((pill) => [pill.text(), pill.attributes('href')]))

    expect(pills_by_label.get('Panasonic')).toBe('/brand/panasonic')
  })

  it('should never render a brand id as a dead /tag/{brand} link', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      tag_ids: ['typing'],
      tag_labels: ['輸入'],
      brand_ids: ['panasonic'],
      brand_labels: ['Panasonic'],
    }))
    const hrefs = wrapper.findAll('.catalog-pill').map((pill) => pill.attributes('href'))

    expect(hrefs).not.toContain('/tag/panasonic')
    expect(hrefs).toContain('/brand/panasonic')
  })
})
