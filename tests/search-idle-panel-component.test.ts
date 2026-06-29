// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import SearchIdlePanel from '../app/components/search/search-idle-panel.vue'
import type { CompactSearchTagGroups, CompactTagChip } from '../app/utils/published-products/types'

// UButton stub：把 `to`（{ path }）序列化到 href，並把 slots 渲染出來以驗證計數顯示。
const UButtonStub = defineComponent({
  name: 'UButton',
  props: {
    to: { type: [String, Object], default: null },
    type: { type: String, default: 'button' },
    color: { type: String, default: '' },
    variant: { type: String, default: '' },
  },
  setup(props, { attrs, slots }) {
    return () => h('a', {
      ...attrs,
      href: props.to === null
        ? undefined
        : typeof props.to === 'string'
          ? props.to
          : (props.to as { path: string }).path,
    }, [slots.default?.(), slots.trailing?.()])
  },
})

function makeTagChip(overrides: Partial<CompactTagChip> = {}): CompactTagChip {
  return { id: 'ergonomic', label: '人體工學', count: 3, active: false, ...overrides }
}

function mountSearchIdlePanel(popular_search_tags: CompactSearchTagGroups, history_items: string[] = []) {
  return mount(SearchIdlePanel, {
    props: { history_items, popular_search_tags },
    global: {
      stubs: { UButton: UButtonStub },
    },
  })
}

describe('search idle panel popular tag chips', () => {
  beforeEach(() => {
    // search-idle-panel.vue 依賴 Nuxt auto-import 的 computed；bare vitest 環境需 stub。
    vi.stubGlobal('computed', computed)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('should deep-link popular tag chips to /tag/{id} and popular brand chips to /brand/{id} (ADR-8)', () => {
    const wrapper = mountSearchIdlePanel({
      tags: [makeTagChip({ id: 'ergonomic', label: '人體工學' })],
      brands: [makeTagChip({ id: 'apple', label: 'Apple' })],
    })
    const chips_by_label = new Map(
      wrapper.findAll('.tag-chip').map((chip) => [chip.text().replace(/\d+$/, '').trim(), chip.attributes('href')]),
    )

    // 用 chip 的 id 深連，不再以 label 打文字搜尋；brand chip 走專屬 /brand/ 前綴。
    expect(chips_by_label.get('人體工學')).toBe('/tag/ergonomic')
    expect(chips_by_label.get('Apple')).toBe('/brand/apple')
  })

  it('should still display each tag count alongside the label', () => {
    const wrapper = mountSearchIdlePanel({
      tags: [makeTagChip({ id: 'wireless', label: '無線', count: 7 })],
      brands: [],
    })
    const chip = wrapper.find('.tag-chip')

    expect(chip.text()).toContain('無線')
    expect(chip.find('.tag-count').text()).toBe('7')
  })
})
