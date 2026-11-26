# 047 works：全站 trailing slash ＋ Nuxt 4.6.4

- **做了什麼**：撤掉雙輸出（備份在 `backup/047-dual-output`）。Nuxt 升到 4.6.4（含 #36050），@nuxt/image 升到 2，並把它新推進 publicAssets 的 `content/` 拿掉，否則 draft JSON 會被公開。頁面 URL 全站改為帶斜線：routes、NuxtLink、程式導航、canonical、sitemap、search index 都已改，RSS guid 不變。generate 加了防線，關掉 `crawlLinks`，並在 `prerender:generate` 擋下無斜線的頁面 route。麵包屑與導覽 active 改成容許尾斜線。尾斜線 middleware 保留為防線。另修好搜尋結果商品圖（含 `%` 檔名的編碼）與模擬器的 open redirect。
- **驗證**：test 727、lint、knip、typecheck、generate 全過，wrangler Pages 模擬器上 E2E 98 passed（31 skipped 為既有）。
  - 產物中 190 個頁面的 payload.path 都等於 `/x/`，HTML 內沒有任何無斜線的站內連結。
  - 開啟 crawlLinks 後 generate 會失敗。拿掉 middleware 後 forced replace 的 E2E 轉紅；在 master 產物上，直接開頁的 E2E 也是紅的。
  - 用 `%` 檔名的圖實測過 generate 與前端載入。
- **沒驗**：
  - 沒有部署到正式 Pages，也沒測 Safari／Firefox。
  - CI 用的 `serve-static-output.ts` 只跑了 unit test，完整 E2E 沒在它上面跑。
  - 檔名含 `&`、`+`、`,` 等保留字元時，Nitro 寫檔會保留 `%26` 這類編碼，可能與 Pages 解碼後的路徑對不上，未實測（現有內容沒有這類檔名）。
- **留給你**：部署後抽查：`/guide` 是否 308 到 `/guide/`，直接開詳情頁時有沒有凍結，Disqus 留言是否仍對到原本的 thread。`feat/046-redesign` 動過 lockfile，rebase 會有衝突。
