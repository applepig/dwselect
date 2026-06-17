import { describe, expect, it } from 'vitest'

import { getResourceRowLinkAttributes, getSearchResultSections } from '../../app/utils/published-products/resource-rows'
import { readContentGuides, readContentLinks } from './fixtures'

describe('resource row link attributes and search sections', () => {
  it('should derive safe attributes for external and internal resource rows', () => {
    expect(getResourceRowLinkAttributes({
      id: 'external-guide',
      type: 'guide',
      title: '外部指南',
      subtitle: '外部摘要',
      meta: null,
      href: 'https://example.com/guide',
      image_url: null,
      icon: 'i-lucide-book-open',
      external: true,
      target: '_blank',
      rel: 'noopener noreferrer',
    })).toEqual({
      href: 'https://example.com/guide',
      target: '_blank',
      rel: 'noopener noreferrer',
    })

    expect(getResourceRowLinkAttributes({
      id: 'internal-guide',
      type: 'guide',
      title: '站內指南',
      subtitle: '站內摘要',
      meta: null,
      href: '/guide/internal-guide',
      image_url: null,
      icon: 'i-lucide-book-open',
      external: false,
      target: null,
      rel: null,
    })).toEqual({
      to: '/guide/internal-guide',
    })
  })

  it('should keep migrated guide and link content available outside products', () => {
    expect(readContentGuides().map((guide) => guide.id)).toEqual([
      '2026-06-02-aeron-chair',
      '2026-06-02-日本米入門篇',
    ])
    expect(readContentLinks().map((link) => link.id)).toEqual([
      '2026-06-02-altwork-station',
      '2026-06-02-b18',
      'applepig-home',
    ])
  })

  it('should group mixed search suggestions into fixed non-empty resource sections', () => {
    const sections = getSearchResultSections([
      {
        document_id: 'link:applepig-home',
        content_id: 'applepig-home',
        type: 'link',
        label: 'applepig.idv.tw',
        title: 'applepig.idv.tw',
        summary: 'DW 的主站',
        category_labels: ['其他'],
        tag_labels: [],
        image_url: 'https://example.com/applepig-logo.png',
        href: 'https://applepig.idv.tw',
        external: true,
        score: 3,
      },
      {
        document_id: 'guide:keyboard-guide',
        content_id: 'keyboard-guide',
        type: 'guide',
        label: '鍵盤指南',
        title: '鍵盤指南',
        summary: '鍵盤挑選重點',
        category_labels: ['電腦'],
        tag_labels: ['輸入'],
        image_url: null,
        href: 'https://example.com/keyboard-guide',
        external: true,
        score: 2,
      },
      {
        document_id: 'product:keyboard',
        content_id: 'keyboard',
        type: 'product',
        label: '機械鍵盤',
        title: '機械鍵盤',
        summary: '打字工作用',
        category_labels: ['電腦'],
        tag_labels: ['輸入'],
        image_url: 'https://example.com/keyboard.jpg',
        href: '/products/keyboard',
        external: false,
        price_text: 'NT$ 1,990',
        channel_label: 'PChome',
        score: 1,
      },
    ])

    expect(sections).toEqual([
      {
        id: 'products',
        label: '產品',
        rows: [
          {
            id: 'product:keyboard',
            type: 'product',
            title: '機械鍵盤',
            subtitle: '打字工作用',
            meta: 'PChome · NT$ 1,990',
            href: '/products/keyboard',
            image_url: 'https://example.com/keyboard.jpg',
            icon: null,
            external: false,
            target: null,
            rel: null,
          },
        ],
      },
      {
        id: 'guides',
        label: '指南',
        rows: [
          {
            id: 'guide:keyboard-guide',
            type: 'guide',
            title: '鍵盤指南',
            subtitle: '鍵盤挑選重點',
            meta: '電腦',
            href: 'https://example.com/keyboard-guide',
            image_url: null,
            icon: 'i-lucide-book-open',
            external: true,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        ],
      },
      {
        id: 'links',
        label: '連結',
        rows: [
          {
            id: 'link:applepig-home',
            type: 'link',
            title: 'applepig.idv.tw',
            subtitle: 'DW 的主站',
            meta: '其他',
            href: 'https://applepig.idv.tw',
            image_url: 'https://example.com/applepig-logo.png',
            icon: 'i-lucide-link',
            external: true,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        ],
      },
    ])
  })

  it('should skip empty mixed search sections', () => {
    const sections = getSearchResultSections([
      {
        document_id: 'guide:keyboard-guide',
        content_id: 'keyboard-guide',
        type: 'guide',
        label: '鍵盤指南',
        title: '鍵盤指南',
        summary: '鍵盤挑選重點',
        category_labels: ['電腦'],
        tag_labels: [],
        image_url: null,
        href: 'https://example.com/keyboard-guide',
        external: true,
        score: 1,
      },
    ])

    expect(sections.map((section) => section.id)).toEqual(['guides'])
  })
})
