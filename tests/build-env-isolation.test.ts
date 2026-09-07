import { afterEach, describe, expect, it, vi } from 'vitest'

import nuxt_config from '../nuxt.config'

// 029 build 環境隔離：buildDir / Vite cacheDir 改吃環境變數，未設時須與現狀完全相同，
// dev mode 行為零影響。env 覆寫後的隔離注入由 dev.sh 三態分流負責（見 dev-server-script.test.ts）。
describe('build env isolation — nuxt.config defaults', () => {
  it('should default buildDir to .nuxt when NUXT_BUILD_DIR is unset', () => {
    expect(nuxt_config.buildDir).toBe('.nuxt')
  })

  it('should default vite.cacheDir to node_modules/.cache/vite when VITE_CACHE_DIR is unset', () => {
    expect(nuxt_config.vite?.cacheDir).toBe('node_modules/.cache/vite')
  })
})

// 045：generate 輸出目錄可由 NUXT_OUTPUT_DIR 覆寫。nuxt.config 在 import 時讀 env，
// 故此處自己控制 env 再重新載入模組，不依賴測試進程外部有沒有設這個變數（容器 verify 會整批傳 env）。
describe('build env isolation — NUXT_OUTPUT_DIR', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function loadNuxtConfigWithOutputDir(value: string | undefined) {
    if (value === undefined) {
      vi.stubEnv('NUXT_OUTPUT_DIR', '')
    }
    else {
      vi.stubEnv('NUXT_OUTPUT_DIR', value)
    }
    vi.resetModules()
    const { default: config } = await import('../nuxt.config')

    return config
  }

  it('should leave nitro.output untouched when NUXT_OUTPUT_DIR is unset (Nitro default .output, CI/deploy 路徑不變)', async () => {
    const config = await loadNuxtConfigWithOutputDir(undefined)

    expect(config.nitro?.output).toBeUndefined()
  })

  it('should point nitro.output.dir at NUXT_OUTPUT_DIR when set', async () => {
    const config = await loadNuxtConfigWithOutputDir('/app/.build-out/output')

    expect(config.nitro?.output?.dir).toBe('/app/.build-out/output')
  })
})
