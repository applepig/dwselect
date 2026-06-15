# 靜態探索檔與公開資料 API

## 目標
讓 dwselect 的靜態輸出同時提供搜尋引擎、RSS reader、AI agent 與外部工具可讀的公開資料入口。

- 新增 root-level `robots.txt`、`llms.txt`、`sitemap.xml`、`rss.xml`。
- 新增靜態 JSON API：`/api/content.json`，一次回傳所有公開內容資料。
- 所有輸出都在 build time 從 Git-backed `content/` JSON 與 taxonomy files 產生，不在公開 runtime fetch Google Sheets、CMS 或外部資料來源。
- `pnpm generate` 必須產生並驗證這些檔案可被靜態部署。

## 非目標
- 不新增管理後台、寫入 API、token 驗證或任何可修改內容的 endpoint。
- 不公開 `draft`、`unpublished`、`archived` 內容。
- 不導入額外 sitemap／RSS Nuxt module；本 sprint 以現有 Node script 與 Vitest 驗證完成。
- 不變更既有 UI、navigation、search 行為與內容 schema。

## User Story
作為搜尋引擎、RSS reader、AI agent 或外部工具，我想要用標準靜態檔與單一 JSON API 取得 dwselect 的公開頁面與內容資料，以便正確索引、訂閱或分析網站內容。

### 驗收條件
- [x] `pnpm generate` 後 `.output/public/robots.txt` 存在，內容允許公開站索引並宣告 `https://dwselect.applepig.net/sitemap.xml`。
- [x] `pnpm generate` 後 `.output/public/llms.txt` 存在，內容以 Markdown 說明此站可供 LLM／agent 讀取的公開資料來源、主要頁面、允許範圍與禁止寫入限制。
- [x] `pnpm generate` 後 `.output/public/sitemap.xml` 存在，包含 `/`、`/guide`、`/search`、`/links` 與所有 published product detail URL，不包含非 published 內容。
- [x] `pnpm generate` 後 `.output/public/rss.xml` 存在，RSS item 來自 published products、guides、links，依 `published_at` 新到舊排序，沒有 `published_at` 的內容排在最後。
- [x] `pnpm generate` 後 `.output/public/api/content.json` 存在，包含 published products、guides、links 與 taxonomy definitions，並以穩定排序輸出。
- [x] `public/search-index.json`、`public/api/content.json` 與 sitemap／RSS 使用同一套 published-only 過濾邏輯，避免 search、API 與頁面可見內容 drift。
- [x] `pnpm test` 覆蓋 build-time payload、XML／TXT 檔案內容、published-only 過濾、穩定排序與 generate script 串接。
- [x] `pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts` 通過。

## 相關檔案
- `scripts/build-search-index.ts` — 現有 build-time content reader 與 search index 產生流程，本 sprint 需抽出或沿用 content 讀取邏輯。
- `scripts/build-product-routes.ts` — 現有 published product route 來源，sitemap product routes 需保持一致。
- `app/utils/product-schema.ts` — content 與 taxonomy schema SSOT。
- `nuxt.config.ts` — `nitro.prerender.routes` 與 static generate 設定；若新增 API path 需確認 output 可用。
- `package.json` — `build`／`generate` scripts 需先產生 discovery/API artifacts。
- `tests/search-index.test.ts` — 現有 build-time content 測試 pattern 可參考。
- `tests/static-generate-workflow.test.ts` — CI command 順序測試需確認仍涵蓋新產物。
- `public/` — 產生 `robots.txt`、`llms.txt`、`sitemap.xml`、`rss.xml`、`api/content.json` 的目標目錄。

## 介面/資料結構（REST / Static JSON）
通訊協定：靜態 HTTP GET。這些檔案由 SSG 產生後作為 static assets 回應，沒有 runtime handler 與 request body。

### `GET /robots.txt`
Response：`text/plain; charset=utf-8`

```txt
User-agent: *
Allow: /

Sitemap: https://dwselect.applepig.net/sitemap.xml
```

### `GET /llms.txt`
Response：`text/plain; charset=utf-8`

```md
# DW嚴選

> DW嚴選是個人選物網站，整理商品、指南與實用連結。

## Public Data

- [All content JSON](https://dwselect.applepig.net/api/content.json): Published products, guides, links, and taxonomies.
- [Search index](https://dwselect.applepig.net/search-index.json): Lightweight searchable document index.
- [Sitemap](https://dwselect.applepig.net/sitemap.xml): Canonical public URLs.
- [RSS](https://dwselect.applepig.net/rss.xml): Recent published updates.

## Usage Notes

Public agents may read and summarize public content. Do not attempt write actions, checkout automation, account actions, or content mutation from the public site.
```

### `GET /sitemap.xml`
Response：`application/xml; charset=utf-8`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dwselect.applepig.net/</loc>
  </url>
  <url>
    <loc>https://dwselect.applepig.net/products/2026-06-02-benq-rd280u</loc>
    <lastmod>2026-06-02</lastmod>
  </url>
</urlset>
```

### `GET /rss.xml`
Response：`application/rss+xml; charset=utf-8`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DW嚴選</title>
    <link>https://dwselect.applepig.net/</link>
    <description>DW嚴選的商品、指南與實用連結更新</description>
    <item>
      <title>BenQ RD280U</title>
      <link>https://dwselect.applepig.net/products/2026-06-02-benq-rd280u</link>
      <guid isPermaLink="true">https://dwselect.applepig.net/products/2026-06-02-benq-rd280u</guid>
      <pubDate>Tue, 02 Jun 2026 00:00:00 +0800</pubDate>
      <description>商品摘要</description>
    </item>
  </channel>
</rss>
```

### `GET /api/content.json`
Response：`application/json; charset=utf-8`

```json
{
  "version": 1,
  "site": {
    "name": "DW嚴選",
    "url": "https://dwselect.applepig.net/"
  },
  "products": [
    {
      "id": "2026-06-02-benq-rd280u",
      "status": "published",
      "name": "BenQ RD280U",
      "summary": "商品摘要",
      "category_id": "computer-monitor",
      "tag_ids": ["monitor"],
      "published_at": "2026-06-02T00:00:00+08:00"
    }
  ],
  "guides": [],
  "links": [],
  "taxonomies": {
    "categories": [],
    "channels": [],
    "tags": [],
    "brands": []
  }
}
```

API payload 使用既有 content schema 欄位，不新增 legacy `category` 或自由字串 `tags`。本地圖片欄位保留原 content 欄位；若外部工具需要可直接顯示的圖片 URL，應使用現有 `/search-index.json`。

## 邊界案例
- 非 published 內容：`draft`、`unpublished`、`archived` 不得出現在 sitemap、RSS、`/api/content.json` 的 products／guides／links 中，但 taxonomy definitions 仍可完整公開，因為 UI 與 search mapping 需要 taxonomy label。
- `published_at = null`：published 內容仍可出現在 API；sitemap `lastmod` 可退回 `updated_at`，RSS 排序放在有 `published_at` 的內容後，`pubDate` 可用 `updated_at`。
- XML special characters：title、summary、URL 必須 escape，避免 `&`、`<`、`>` 破壞 sitemap 或 RSS。
- 空內容集合：products、guides 或 links 為空時仍輸出合法空陣列、合法 sitemap 與合法 RSS channel。
- 站台 URL：正式 URL 固定使用 `https://dwselect.applepig.net/`；本機 dev domain `dwselect.toybox.local` 不寫入公開 artifacts。

## ADR（Architecture Decision Record）
- 決策：以 build-time Node script 產生 `public/robots.txt`、`public/llms.txt`、`public/sitemap.xml`、`public/rss.xml`、`public/api/content.json`。
- 原因：專案是 Nuxt 4 SSG，內容 SSOT 是 Git-backed `content/` JSON；build-time script 可與 `public/search-index.json` 同步，避免公開 runtime 引入外部 fetch 或 server handler。
- 替代方案：使用 Nuxt server API route 並 prerender `/api/content.json`。排除原因：目前沒有 `server/` route，新增 runtime handler 會增加 Nitro route 行為與 prerender coupling；本需求只需要靜態檔。
- 替代方案：導入 sitemap/RSS module。排除原因：需求範圍小，現有技術棧已可用 Node script 完成；新增 module 會增加設定與 dependency 維護成本。

## Milestones

### Milestone 1：共用 content reader 與公開 payload
> 預期結果：build-time 程式可穩定讀取 products、guides、links、taxonomies，產生 published-only API payload。
> 驗證方式：`pnpm test tests/public-discovery.test.ts`

- [x] 撰寫/更新測試（Red）：驗證 published-only 過濾、taxonomy 輸出、穩定排序、缺少 content dir 時空陣列行為。
- [x] 實作最小功能（Green）：抽出或新增 build-time content reader 與 `buildPublicContentPayload()`。
- [x] Refactor 並確認測試維持通過：避免與 `scripts/build-search-index.ts` 的 content reading 邏輯 drift。

### Milestone 2：產生 robots、llms、sitemap、RSS、API 檔案
> 預期結果：執行 build script 後 `public/` 內有五個公開 artifacts。
> 驗證方式：`pnpm test tests/public-discovery.test.ts`

- [x] 撰寫/更新測試（Red）：驗證檔案路徑、文字內容、XML escape、URL、RSS 排序與 sitemap product route。
- [x] 實作最小功能（Green）：新增 build script 產生 `robots.txt`、`llms.txt`、`sitemap.xml`、`rss.xml`、`api/content.json`。
- [x] Refactor 並確認測試維持通過：確認輸出格式穩定且檔尾 newline 一致。

### Milestone 3：串接 generate workflow 與完整驗證
> 預期結果：`pnpm generate` 會先產生 search index 與 discovery/API artifacts，static output 包含所有新檔案。
> 驗證方式：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`

- [x] 撰寫/更新測試（Red）：驗證 `package.json` scripts 或 workflow 不會漏跑 discovery/API build step。
- [x] 實作最小功能（Green）：更新 `package.json` 的 `build`／`generate` 前置步驟，必要時更新 workflow 測試。
- [x] Refactor 並確認測試維持通過：執行完整品質閘門並記錄結果到 `works.md`。
