import { existsSync } from 'node:fs'

// 為什麼：host 與容器同跑 nuxt dev 會共用 .nuxt / Vite cache，導致 chunk hash 衝突。
// 本專案 dev server 一律走 Docker（./dev.sh），故 host 直接 pnpm dev 一律擋掉。
// Docker 會在容器內自動建立 /.dockerenv，host 沒有，藉此判斷執行環境。
if (!existsSync('/.dockerenv')) {
  console.error(`
✗ 偵測到在 host 直接執行 nuxt dev，已中止。

  本專案的 dev server 一律透過 Docker 容器執行，請改用：

      ./dev.sh start      # 啟動 dev 容器
      ./dev.sh logs       # 查看 Nuxt log

  原因：host 與容器同時跑 Nuxt 會共用 .nuxt / Vite cache，造成 chunk hash 衝突。
`)
  process.exit(1)
}
