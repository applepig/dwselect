import { ref, type Ref } from 'vue'

// Nuxt useState 的最小替身：同 key 回同一個 Ref、首次呼叫以 init 建值。bare vitest 沒有 Nuxt runtime，
// 元件與 composable 透過 auto-import 呼叫 useState，測試以 vi.stubGlobal('useState', createUseStateStub()) 掛上；
// 每個 test 各建一份，讓跨元件共享的狀態（如 active view-transition 商品）不會在 test 之間外洩。
export function createUseStateStub() {
  const state_by_key = new Map<string, Ref<unknown>>()

  return function useState<T>(key: string, init?: () => T): Ref<T> {
    if (!state_by_key.has(key)) {
      state_by_key.set(key, ref(init ? init() : undefined))
    }

    return state_by_key.get(key) as Ref<T>
  }
}
