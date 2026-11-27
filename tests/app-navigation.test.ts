// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'

import AppNavigation from '../app/components/app-navigation.vue'

const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: { type: [String, Object], default: null } },
  setup(props, { attrs, slots }) {
    return () => h('a', { ...attrs, href: typeof props.to === 'string' ? props.to : undefined }, slots.default?.())
  },
})

async function mountAppNavigation(path: string) {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useRoute', () => ({ path, params: {} }))
  vi.stubGlobal('useCatalogShellData', async () => ref({
    desktop_category_items: [
      { id: 'all', label: '全部', count: 3 },
      { id: 'computer', label: '電腦', count: 1 },
    ],
  }))

  const wrapper = mount(defineComponent({
    components: { AppNavigation },
    template: '<Suspense><AppNavigation /></Suspense>',
  }), {
    global: { stubs: { NuxtLink: NuxtLinkStub, UIcon: true } },
  })

  await flushPromises()

  return wrapper
}

function readCurrentLabels(wrapper: Awaited<ReturnType<typeof mountAppNavigation>>, selector: string) {
  return wrapper.findAll(`${selector} [aria-current="page"]`).map((link) => link.text().replace(/\d+$/, '').trim())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// 047：頁面 URL 全站帶尾斜線；route.path 是 `/guide/` 時導覽仍要標示 active，不能因嚴格比對失效。
describe('AppNavigation active state on trailing-slash routes', () => {
  it.each([
    ['/guide/', '指南'],
    ['/links/', '連結'],
    ['/search/', '搜尋'],
  ])('should mark the rail tab active on %s', async (path, label) => {
    const wrapper = await mountAppNavigation(path)

    expect(readCurrentLabels(wrapper, '.compact-app-rail')).toEqual([label])
  })

  it('should mark the home tab and the all-categories item active only on the root', async () => {
    const wrapper = await mountAppNavigation('/')

    expect(readCurrentLabels(wrapper, '.compact-app-rail')).toEqual(['首頁'])
    expect(readCurrentLabels(wrapper, '.desktop-category-items')).toEqual(['全部'])
  })

  it('should mark the sidebar category active on a trailing-slash category route', async () => {
    const wrapper = await mountAppNavigation('/category/computer/')

    expect(readCurrentLabels(wrapper, '.desktop-category-items')).toEqual(['電腦'])
    expect(readCurrentLabels(wrapper, '.compact-app-rail')).toEqual([])
  })
})
