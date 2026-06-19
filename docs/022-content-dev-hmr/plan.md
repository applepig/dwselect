# Content API 與圖片 SSG 化規劃

## 背景

目前公開內容的 SSOT 是 Git-backed `content/` JSON 與 taxonomy files。Runtime 使用的資料不是直接讀 `content/`，而是由 build scripts 先產生 public artifacts：

- `public/api/content.json`：首頁、guide、links、product detail 與 layout shell 的 catalog payload。
- `public/search-index.json`：client search lazy loader 使用的 MiniSearch payload。
- `public/images/**`：本地 content 圖片轉成 WebP 後的公開資產。
- `public/sitemap.xml`、`public/rss.xml`、`public/robots.txt`、`public/llms.txt`：公開 discovery artifacts。

這能確保 `pnpm generate` 的 static output 正確，但 content authoring 時每次都要手動跑 artifact build 或 `pnpm generate`，dev server 的即時回饋沒有充分利用。

## 已排除方向

- `@nuxt/content`：先前已試過並因 bundle size 過大取消，本 sprint 不重新導入。
- Dev-only watcher 重建 `public/*.json` 後 full reload：可行但仍維持自寫 artifact pipeline，且 dev 與 production API 路徑分叉。
- Vite `import.meta.glob`／`vite-imagetools` 圖片 pipeline：能取得 Vite HMR，但會讓 API payload 耦合 Vite hashed asset 或 virtual module，對 Git-backed JSON API 不夠直覺。

## 選定方向

Production API 一起改成 Nuxt／Nitro server routes，並透過 `nuxt generate` prerender 成 static output，儘量使用 Nuxt SSG 生態系。

- `GET /api/content.json`：Nuxt server route 即時從 `content/` 讀取並產生 public payload。
- `GET /search-index.json`：Nuxt server route 即時從 `content/` 讀取並產生 MiniSearch payload。
- `nuxt generate`：prerender `/api/content.json` 與 `/search-index.json` 到 `.output/public`，production 仍是 static files。
- 圖片：導入 `@nuxt/image`，dev 由 IPX 即時處理，generate 輸出頁面實際使用的 optimized static images。
- API payload：改輸出 source image metadata 或 source image URL，不再輸出 `/images/products/*.webp` 這類自建 generated artifact URL。

## 取捨

優點：

- Dev、generate、production API 邏輯同源，降低 payload drift。
- 圖片 resize、WebP、dev 即時處理與 static generate 交給 Nuxt Image／IPX。
- 不需要為 content preview 維護 `build-content-images` 與 `build-public-artifacts` 這類前置步驟。

代價：

- API image contract 會改變；外部消費者需理解 image source path 不等於 optimized output URL。
- `<img>` 需要改為 `<NuxtImg>` 或專案包裝元件。
- `nuxt generate` 只會產生被 prerender 頁面實際使用到的 optimized images；search-only 圖片需要確保也被 prerender 頁面涵蓋，或額外列 `_ipx` routes。

## 決策結果

採用「Nuxt server routes prerender + Nuxt Image」作為 022 sprint 的正式方向，詳見 `spec.md`。
