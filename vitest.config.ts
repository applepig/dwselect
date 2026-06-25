import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

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
  test: {
    environment: 'node',
    // 排除 git worktree（.worktree/<branch>/）下的測試副本，避免 vitest 撈到其他分支的完整測試集造成雜訊。
    exclude: [...configDefaults.exclude, '.worktree/**'],
  },
})
