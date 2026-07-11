import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

import { getSiteUrl } from './scripts/site-url'

// vitest 預設不把 .env 灌進 process.env，但 nuxt.config.ts 在 import 時讀 process.env.APP_URL，
// 沒有就 throw；用 Node 內建 loadEnvFile 載入 .env，讓測試不必每次手動帶 APP_URL= 前綴。
// CI 沒有 .env 檔（由 job env 提供 APP_URL），檔案不存在時略過。
try {
  process.loadEnvFile()
}
catch {
  // .env 不存在，沿用既有 process.env
}

export default defineConfig({
  plugins: [vue()],
  // seo-metadata 的 SITE_URL 由 __DW_SITE_URL__ 烤入；測試環境與真實 build 同樣從 APP_URL 導出，
  // 讓 canonical／og 的行為測試跟著 env 走（AC4），不寫死網域。
  define: {
    __DW_SITE_URL__: JSON.stringify(getSiteUrl()),
    __DW_DISQUS_SHORTNAME__: JSON.stringify(process.env.DISQUS_SHORTNAME?.trim() ?? ''),
  },
  test: {
    environment: 'node',
    // 排除 git worktree（.worktree/<branch>/）下的測試副本，避免 vitest 撈到其他分支的完整測試集造成雜訊。
    // tests/legacy/** 是已完成 migration 的測試，隨對應 script 移入 scripts/legacy/ 一併退出預設集（可手動指定路徑復活）。
    // tests/e2e/** 是 Playwright spec，由 `pnpm test:e2e` 執行，vitest 不應撿到（AC14）。
    exclude: [...configDefaults.exclude, '.worktree/**', 'tests/legacy/**', 'tests/e2e/**'],
  },
})
