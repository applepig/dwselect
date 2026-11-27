# 047 works：全站 trailing slash ＋ Nuxt 4.6.4

- **做了什麼**：撤掉雙輸出（備份在 `backup/047-dual-output`）。Nuxt 升到 4.6.4（含 #36050），@nuxt/image 升到 2，並把它新推進 publicAssets 的 `content/` 拿掉，否則 draft JSON 會被公開。頁面 URL 全站改為帶斜線：routes、NuxtLink、程式導航、canonical、sitemap、search index 都已改，RSS guid 不變。generate 加了防線，關掉 `crawlLinks`，並在 `prerender:generate` 擋下無斜線的頁面 route。麵包屑與導覽 active 改成容許尾斜線，尾斜線 middleware 保留為防線。另修好搜尋結果商品圖（含 `%` 檔名的編碼）與模擬器的 open redirect。
- **驗證**：test、lint、knip、typecheck、generate 全過。E2E 在 wrangler Pages 模擬器與 CI 用的 `serve-static-output.ts` 上都是 98 passed（31 skipped 為既有），站內真實換頁的 VT 有啟動且正常 finished。
  - 產物中 190 個頁面的 payload.path 都是 `/x/`，HTML 沒有不帶斜線的站內連結；`%` 檔名的圖實測可 generate、前端可載入。
  - 開回 crawlLinks 時 generate 失敗；拿掉 middleware、或改用 master 產物時，E2E 會紅。
- **沒驗**：
  - 沒部署到正式 Pages，沒測 Safari／Firefox。dev 模式（容器內 `nuxt dev`、HMR）與容器內的 install／verify 也沒跑。
  - 檔名含 `&`、`+`、`,` 時可能與 Pages 的路徑對不上（推論，現有內容沒有這類檔名）。
  - crawlLinks 關掉後，generate 不再偵測站內斷鏈。目前產物沒有斷鏈，也還沒加防線。
- **留給你**：部署後抽查 `/guide` 是否 308 到 `/guide/`、直接開詳情頁會不會凍結、Disqus 留言是否仍對到原本的 thread。`feat/046-redesign` 動過 lockfile，rebase 會衝突。
