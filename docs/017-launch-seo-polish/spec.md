# 公開前 SEO 與品牌整理

## 目標
補齊 dwselect 上線公開前仍缺的品牌、SEO、分享預覽與錯誤頁基本體驗。

- 匯入正式 favicon：來源 `https://applepig.idv.tw/favicon.ico`，放入 `public/favicon.ico`。
- 使用使用者提供的 `public/og-image.png` 作為全站預設 Open Graph／Twitter card 圖。
- 補齊全站 SEO meta、Open Graph、Twitter card 與 `html lang="zh-Hant"`。
- 商品詳情頁輸出商品專屬 title、description、canonical URL 與分享 meta。
- 移除根目錄 Vite 樣板 `index.html`，避免誤導或被誤部署。
- 新增簡單 `app/error.vue`，讓 404／錯誤狀態不是 Nuxt 預設畫面。

## 非目標
- 不重做 `robots.txt`、`sitemap.xml`、`rss.xml`、`llms.txt` 或 `/api/content.json`；這些已由 sprint 016 完成。
- 不新增 sitemap／SEO Nuxt module。
- 不改 UI 主流程、商品資料 schema、navigation 或 search 行為。
- 不新增 analytics；GTM 已在 sprint 016 merge 進 `v3-dev`。
- 不重新設計 OG 圖；本 sprint 使用現有 `public/og-image.png`。

## User Story
作為公開訪客或從社群連結進站的人，我想要看到正確的分頁圖示、分享預覽、搜尋摘要與 404 畫面，以便確認這是正式站台並快速理解頁面內容。

### 驗收條件
- [x] `public/favicon.ico` 存在，來源為 `https://applepig.idv.tw/favicon.ico` 的一次性匯入檔案。
- [x] 全站 head 具有 `htmlAttrs.lang = 'zh-Hant'`、favicon link、canonical URL、description、Open Graph 與 Twitter card meta。
- [x] 首頁 title／description 使用站台級文案，OG image 指向 `https://dwselect.applepig.net/og-image.png`。
- [x] 商品詳情頁 title 使用 `<商品名稱>｜DW嚴選`，description 使用商品 summary，canonical URL 使用 `/products/:id`，OG/Twitter image 使用站台預設 `og-image.png`。
- [x] `/guide`、`/links`、`/search` 至少有頁面專屬 title／description／canonical URL。
- [x] 根目錄 `index.html` 被移除。
- [x] `app/error.vue` 存在；404 顯示「找不到頁面」與回首頁行動，其他錯誤顯示通用錯誤訊息。
- [x] `pnpm test` 覆蓋 SEO meta、favicon link、Vite index 移除、error page 存在與商品頁 meta 契約。
- [x] `pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts` 通過。

## 相關檔案
- `app/app.vue` — 全站 head baseline，目前只有 title。
- `app/pages/index.vue` — 首頁 SEO meta。
- `app/pages/products/[id].vue` — 商品詳情 SEO meta。
- `app/pages/guide.vue` — 指南頁 SEO meta。
- `app/pages/links.vue` — 連結頁 SEO meta。
- `app/pages/search.vue` — 搜尋頁 SEO meta。
- `app/error.vue` — 新增錯誤頁。
- `public/og-image.png` — 使用者提供的預設分享圖。
- `public/favicon.ico` — 從 `https://applepig.idv.tw/favicon.ico` 匯入。
- `index.html` — Vite 樣板檔，應刪除。
- `tests/app-config.test.ts` 或新測試檔 — 驗證 head/meta 靜態契約。

## 介面/資料結構（HTTP / Static Assets / HTML Meta）
通訊協定：靜態 HTTP GET 與 HTML head meta。沒有新增 runtime API。

### Static Assets
```txt
GET /favicon.ico
GET /og-image.png
```

### Site Meta Baseline
```ts
const SITE_URL = 'https://dwselect.applepig.net/'
const SITE_NAME = 'DW嚴選'
const SITE_DESCRIPTION = '值得買、值得看、值得收藏的選物清單。'
const SITE_OG_IMAGE = 'https://dwselect.applepig.net/og-image.png'
```

### 首頁 head
```ts
useSeoMeta({
  title: 'DW嚴選｜值得買、值得看、值得收藏的選物清單',
  description: SITE_DESCRIPTION,
  ogTitle: 'DW嚴選',
  ogDescription: SITE_DESCRIPTION,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
})
```

### 商品詳情 head
```ts
useSeoMeta({
  title: `${product.name}｜DW嚴選`,
  description: product.summary,
  ogTitle: `${product.name}｜DW嚴選`,
  ogDescription: product.summary,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
})
```

## 邊界案例
- 商品不存在：保留既有 404 throw 行為，由 `app/error.vue` 顯示友善錯誤頁。
- 商品 summary 為空字串：description fallback 到站台 description，避免輸出空 meta。
- 本機 dev domain：公開 meta canonical 與 OG URL 固定使用 `https://dwselect.applepig.net/`，不輸出 `dwselect.toybox.local`。
- OG 圖缺失：測試應檢查 `public/og-image.png` 存在；若不存在則 fail，避免部署無圖 preview。
- favicon 來源不可用：實作時應將檔案 commit 到 repo；後續 build 不依賴外部 URL。

## ADR（Architecture Decision Record）
- 決策：使用 Nuxt 內建 `useHead`／`useSeoMeta` 與本地 static assets 完成 SEO polish。
- 原因：需求是少量固定頁面與商品詳情 meta，不需要新增 SEO module dependency；本地 assets 可被 static generate 直接複製。
- 替代方案：導入 `@nuxtjs/seo` 或 sitemap/robots modules。排除原因：sprint 016 已用 build-time artifacts 解決 robots/sitemap/rss/llms/API，本 sprint 不需要新增 dependency。
- 替代方案：商品頁 OG image 使用商品圖。排除原因：部分商品圖尺寸與外部 URL 不一定適合社群 preview；首版公開先使用一致的站台 OG 圖，降低風險。

## Milestones

### Milestone 1：品牌 assets 與樣板清理
> 預期結果：favicon 與 OG image 可被 static output 提供，Vite 樣板不再存在。
> 驗證方式：`pnpm test tests/launch-seo.test.ts`

- [x] 撰寫/更新測試（Red）：驗證 `public/favicon.ico`、`public/og-image.png` 存在，且根目錄 `index.html` 不存在。
- [x] 實作最小功能（Green）：匯入 favicon、保留 OG 圖、刪除 Vite `index.html`。
- [x] Refactor 並確認測試維持通過。

### Milestone 2：全站與頁面 SEO meta
> 預期結果：首頁、guide、links、search、商品詳情頁都有正確 SEO meta 與 canonical URL。
> 驗證方式：`pnpm test tests/launch-seo.test.ts`

- [x] 撰寫/更新測試（Red）：驗證 app/page source 包含 `zh-Hant`、favicon、canonical、OG、Twitter card 與商品 meta 契約。
- [x] 實作最小功能（Green）：新增 SEO constants/helper 或直接在頁面用 `useSeoMeta`，保持最小範圍。
- [x] Refactor 並確認測試維持通過。

### Milestone 3：友善錯誤頁與完整驗證
> 預期結果：404／錯誤頁有品牌化訊息與回首頁 CTA，完整品質閘門通過。
> 驗證方式：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`

- [x] 撰寫/更新測試（Red）：驗證 `app/error.vue` 存在並包含 404 文案與回首頁行動。
- [x] 實作最小功能（Green）：新增 `app/error.vue`。
- [x] Refactor 並確認測試維持通過，更新 `works.md`。
