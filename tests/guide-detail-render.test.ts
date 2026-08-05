// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'
import { useDetailBackNavigation } from '../app/composables/use-detail-back-navigation'
import GuideDetail from '../app/components/guide-detail.vue'
import ContentMarkdown from '../app/components/content-markdown.vue'
import ProductCard from '../app/components/product-card.vue'
import RelatedProductsSection from '../app/components/related-products-section.vue'
import ShareButtons from '../app/components/share-buttons.vue'
import type { GuideDetailView, ProductCardView } from '../app/utils/public-content-view-types'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

const CatalogPillStub = {
  props: ['to', 'variant'],
  template: '<a class="catalog-pill" :href="typeof to === \'string\' ? to : (to && to.path)"><slot /></a>',
}

const NuxtImgStub = {
  props: ['src', 'alt'],
  template: '<img data-component="nuxt-img" :src="src" :alt="alt" />',
}

const UButtonStub = {
  props: ['to', 'icon', 'block', 'size', 'color', 'variant'],
  // 只宣告自身 props；target／rel 交給呼叫端 fallthrough 到單一 root anchor，
  // 這樣元件真的漏掉安全外連屬性時測試才會紅。
  template: '<a :href="to"><slot /></a>',
}

const UIconStub = { props: ['name'], template: '<i />' }

const UCardStub = { props: ['ui'], template: '<div><slot /></div>' }
const DisqusThreadStub = {
  props: ['contentType', 'contentId'],
  template: '<div class="disqus-thread-stub" :data-content-type="contentType" :data-content-id="contentId" />',
}

function mountGuideDetail(detail: GuideDetailView) {
  return mount(GuideDetail, {
    props: { detail },
    global: {
      components: { ContentMarkdown, RelatedProductsSection, ProductCard, ShareButtons, DisqusThread: DisqusThreadStub },
      stubs: {
        NuxtLink: NuxtLinkStub,
        CatalogPill: CatalogPillStub,
        NuxtImg: NuxtImgStub,
        UButton: UButtonStub,
        UIcon: UIconStub,
        UCard: UCardStub,
      },
    },
  })
}

function makeRelatedProductCard(overrides: Partial<ProductCardView> = {}): ProductCardView {
  return {
    id: 'product-a',
    name: '商品 A',
    summary: '推薦短評',
    image_url: '/products/images/a.jpg',
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

function makeGuideDetailView(overrides: Partial<GuideDetailView> = {}): GuideDetailView {
  return {
    id: 'sample-guide',
    title: '示範指南',
    summary: '這是指南摘要。',
    body: '## 標題\n\n第一段內文 [參考連結](https://example.com/ref) 結尾。\n\n- 項目一\n- 項目二',
    hero_image_url: '/guides/images/sample-guide.jpg',
    hero_alt: '示範指南',
    category_ids: ['computer'],
    category_labels: ['電腦'],
    tag_ids: ['typing'],
    tag_labels: ['輸入'],
    brand_ids: [],
    brand_labels: [],
    source_url: 'https://example.com/sample-guide',
    reference_links: [],
    related_products: [],
    ...overrides,
  }
}

describe('GuideDetail', () => {
  // GuideDetail 在 setup 頂層呼叫 useRouter()，此測試環境無 Nuxt auto-import，需 stub。
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('onUnmounted', onUnmounted)
    vi.stubGlobal('useRoute', () => ({ path: '/guide/sample-guide' }))
    vi.stubGlobal('useRouter', () => ({ back: vi.fn(), push: vi.fn() }))
    vi.stubGlobal('useDetailBackNavigation', useDetailBackNavigation)
    vi.stubGlobal('useBrokenImageFallback', useBrokenImageFallback)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should render the guide title', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ title: '鍵盤入門指南' }))

    expect(wrapper.find('.detail-title').text()).toBe('鍵盤入門指南')
  })

  it('should render the body markdown through ContentMarkdown', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView())

    expect(wrapper.find('.detail-llm-heading').text()).toContain('標題')
    expect(wrapper.findAll('.detail-llm-list li')).toHaveLength(2)
    const body_link = wrapper.findAll('.detail-llm-link').find((link) => link.attributes('href') === 'https://example.com/ref')
    expect(body_link).toBeTruthy()
  })

  it('should fall back to the summary when the body is empty', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ body: '', summary: '只有摘要可用。' }))

    expect(wrapper.text()).toContain('只有摘要可用。')
    expect(wrapper.find('.detail-llm-heading').exists()).toBe(false)
  })

  it('should render category and tag pills with their labels', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      category_ids: ['computer', 'home-living'],
      category_labels: ['電腦', '居家'],
      tag_ids: ['typing', 'wireless'],
      tag_labels: ['輸入', '無線'],
    }))
    const pill_texts = wrapper.findAll('.catalog-pill').map((pill) => pill.text())

    expect(pill_texts).toContain('電腦')
    expect(pill_texts).toContain('居家')
    expect(pill_texts).toContain('輸入')
    expect(pill_texts).toContain('無線')
  })

  it('should expose a read-original link pointing at the source url opening in a new tab', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ source_url: 'https://example.com/original-post' }))
    const source_link = wrapper.find('a.detail-summary-buy-link')

    expect(source_link.exists()).toBe(true)
    expect(source_link.text()).toBe('看原文')
    expect(source_link.attributes('href')).toBe('https://example.com/original-post')
    expect(source_link.attributes('target')).toBe('_blank')
    expect(source_link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('keeps both read-original calls to action pointed at the guide source url', () => {
    const source_url = 'https://example.com/original-post'
    const wrapper = mountGuideDetail(makeGuideDetailView({ source_url }))
    const source_links = wrapper.findAll('a').filter((link) => link.text() === '看原文')

    expect(source_links).toHaveLength(2)
    for (const source_link of source_links) {
      expect(source_link.attributes('href')).toBe(source_url)
      expect(source_link.attributes('target')).toBe('_blank')
      expect(source_link.attributes('rel')).toBe('noopener noreferrer')
    }
  })

  it('should render supplied reference links with their labels and safe external link attributes', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      reference_links: [{ title: 'Facebook 參考貼文', url: 'https://example.com/reference-post' }],
    }))
    const section = wrapper.find('.detail-reference-links')

    expect(section.exists()).toBe(true)
    const reference_link = section.find('.detail-reference-link')
    expect(section.find('.detail-reference-links-title').text()).toBe('參考資料')
    expect(reference_link.text()).toBe('Facebook 參考貼文')
    expect(reference_link.attributes('href')).toBe('https://example.com/reference-post')
    expect(reference_link.attributes('target')).toBe('_blank')
    expect(reference_link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('should not render a reference section when the guide has no reference links', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ reference_links: [] }))

    expect(wrapper.find('.detail-reference-links').exists()).toBe(false)
  })

  it('should render related product cards linking to each product detail when related products exist', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({
      related_products: [
        makeRelatedProductCard({ id: 'product-a', name: '商品 A' }),
        makeRelatedProductCard({ id: 'product-b', name: '商品 B', channel_id: 'momo', channel_ids: ['momo'], channel_label: 'momo' }),
      ],
    }))
    const related_section = wrapper.find('.related-products-section')
    const related_hrefs = related_section.findAll('a').map((anchor) => anchor.attributes('href'))

    expect(related_section.exists()).toBe(true)
    expect(related_hrefs).toContain('/products/product-a')
    expect(related_hrefs).toContain('/products/product-b')
    expect(related_section.text()).toContain('商品 A')
    expect(related_section.text()).toContain('商品 B')
  })

  it('should not render the related products section when there are no related products', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ related_products: [] }))

    expect(wrapper.find('.related-products-section').exists()).toBe(false)
  })

  it('should render the hero image with the guide alt text when a hero image url is present', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: '/guides/images/hero.jpg', hero_alt: '英雄圖替代文字' }))
    const hero_image = wrapper.find('.detail-hero-image')

    expect(hero_image.exists()).toBe(true)
    expect(hero_image.attributes('src')).toBe('/guides/images/hero.jpg')
    expect(hero_image.attributes('alt')).toBe('英雄圖替代文字')
  })

  it('should not render an empty hero tile when the guide has no hero image url', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: '' }))

    expect(wrapper.find('.detail-hero-tile').exists()).toBe(false)
    expect(wrapper.find('.detail-hero-image').exists()).toBe(false)
    expect(wrapper.find('.detail-image-fallback-icon').exists()).toBe(false)
    expect(wrapper.find('.detail-summary-column .detail-back').exists()).toBe(true)
  })

  it('should render a local hero image through NuxtImg', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: '/guides/images/local-hero.jpg', hero_alt: '本地英雄圖' }))
    const hero_image = wrapper.find('.detail-hero-image')

    expect(hero_image.exists()).toBe(true)
    expect(hero_image.attributes('data-component')).toBe('nuxt-img')
    expect(hero_image.attributes('src')).toBe('/guides/images/local-hero.jpg')
    expect(hero_image.attributes('alt')).toBe('本地英雄圖')
  })

  it('should render an external hero image through a native img instead of NuxtImg', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ hero_image_url: 'https://example.com/external-hero.jpg', hero_alt: '外部英雄圖' }))
    const hero_image = wrapper.find('.detail-hero-image')

    expect(hero_image.exists()).toBe(true)
    expect(hero_image.attributes('data-component')).toBeUndefined()
    expect(hero_image.attributes('src')).toBe('https://example.com/external-hero.jpg')
    expect(hero_image.attributes('alt')).toBe('外部英雄圖')
  })

  // 守護視覺回歸：catalog.css 把 .product-detail-page 共用選擇器背景改為 transparent，
  // panel 表面色（--dw-panel）改由 root 直屬的 .product-transition-shell 背景層補回。
  // guide 詳情頁 root 同掛 .product-detail-page，必須一併有此背景 shell，否則整頁掉 panel 底色。
  it('should render a transition shell background layer directly under the detail page root', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView())
    const root = wrapper.find('.product-detail-page')
    const shell = root.element.querySelector(':scope > .product-transition-shell')

    expect(shell).not.toBeNull()
  })

  // guide 不參與卡片→詳情 morph，shell 純粹承載 panel 背景，
  // 不應掛 product-vt-card（避免多出無用的 view-transition-name）。
  it('should not tag the guide transition shell as a view-transition card', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView())
    const shell = wrapper.find('.product-transition-shell')

    expect(shell.exists()).toBe(true)
    expect(shell.classes()).not.toContain('product-vt-card')
  })

  it('should render the share block wired with the guide title as share title (AC9)', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ title: '好物指南' }))
    const share_section = wrapper.find('.share-section')
    const x_link = share_section.find('.share-platform-link[data-platform="x"]')

    expect(share_section.exists()).toBe(true)
    expect(x_link.attributes('href')).toContain(`text=${encodeURIComponent('好物指南')}`)
  })

  it('將 guide type 與 id 掛給 Disqus thread，讓 thread identity 不依賴標題（AC14）', () => {
    const wrapper = mountGuideDetail(makeGuideDetailView({ id: 'guide-a', title: '可改名指南' }))
    const thread = wrapper.find('.disqus-thread-stub')

    expect(thread.attributes('data-content-type')).toBe('guides')
    expect(thread.attributes('data-content-id')).toBe('guide-a')
  })
})
