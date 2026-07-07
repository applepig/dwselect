// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import ErrorPage from '../app/error.vue'

describe('error page home action', () => {
  // error.vue 依賴 Nuxt auto-import 的 computed 與 clearError；bare vitest 無 auto-import，需 stub。
  // clearError 用具名 mock 以便斷言點擊行為，而非只是讓元件不炸的 no-op。
  const clear_error_mock = vi.fn()

  beforeAll(() => {
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('clearError', clear_error_mock)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  function mountErrorPage(status_code: number) {
    return mount(ErrorPage, {
      props: { error: { statusCode: status_code } as never },
      global: {
        stubs: {
          UApp: { template: '<div><slot /></div>' },
          NuxtLayout: { template: '<div><slot /></div>' },
          NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        },
      },
    })
  }

  it('should clear the error and redirect home when 「回首頁」 is clicked', async () => {
    // 只驗 render 出 home href 擋不住 @click.prevent／clearError({ redirect }) 被移除的 regression，
    // 使用者仍會卡在 error state；故實際觸發點擊，斷言 clearError 帶 redirect 呼叫。
    clear_error_mock.mockClear()
    const wrapper = mountErrorPage(404)

    await wrapper.get('.error-home-link').trigger('click')

    expect(clear_error_mock).toHaveBeenCalledWith({ redirect: '/' })
  })
})
