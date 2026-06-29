import { describe, expect, it } from 'vitest'

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
