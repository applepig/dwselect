# Content API 與圖片 SSG 化

## 目標

將 content authoring 的 dev 體驗與 production static output 改成更貼近 Nuxt SSG 生態系：Public content API 與 search index 由 Nuxt server routes 產生，`nuxt generate` prerender 成 static files；圖片由 `@nuxt/image`／IPX 處理 dev 即時最佳化與 static generate 輸出，減少自寫 generated artifact pipeline。

## 非目標

- 不導入 `@nuxt/content`，因先前已因 bundle size 過大取消。
- 不新增公開 runtime 外部資料來源；content SSOT 仍是 Git-backed `content/` JSON 與 taxonomy files。
- 不維持舊版 API payload image URL 格式的相容層；網站尚可接受 API contract 變更。
- 不在第一版支援外部 CMS 或遠端圖片 CDN provider。
- 不把 search UI 改成 server-side search；client MiniSearch 搜尋模式維持。

## User Story

作為 content author，我想要修改 `content/` JSON、taxonomy 或本地圖片後，Nuxt dev server 能用同一套 production API handler 即時反映資料與圖片，以便不需要手動重建 public artifacts 才能確認內容呈現。

作為維護者，我想要 production API、search index 與圖片輸出都由 Nuxt SSG 流程產生，以便降低自寫 build scripts 與 runtime payload drift 的風險。

### 驗收條件

- [ ] `GET /api/content.json` 由 Nuxt server route 產生，回傳 published products、guides、links、taxonomy 與 navigation payload。
- [ ] `GET /search-index.json` 由 Nuxt server route 產生，回傳 client MiniSearch 所需 payload。
- [ ] `pnpm generate` 會 prerender `/api/content.json` 與 `/search-index.json` 到 `.output/public`，production 不需要 server runtime 才能提供這兩個端點。
- [ ] App server side 與 client side 都透過同一個 route contract 取得 content payload，不再直接讀 `public/api/content.json` 作為 primary source。
- [ ] Dev 模式修改 content JSON／taxonomy 後，重新請求 API 可讀到最新 content source；頁面資料可透過 Nuxt data refresh 或 route navigation 取得最新資料。
- [ ] 商品與指南圖片改由 `@nuxt/image` 顯示與最佳化；dev 不需要執行 `pnpm build:content-images` 才能看到新圖。
- [ ] `pnpm generate` 會輸出頁面實際使用的 optimized images，static site 可在無 server runtime 下顯示圖片。
- [ ] 舊的 `public/api/content.json`、`public/search-index.json`、`public/images/**` generated artifact 不再是 dev content preview 的必要步驟；若仍保留 script，只作 legacy／相容工具。

## 相關檔案

- `server/api/content.json.get.ts` — 新增 public content API route。
- `server/routes/search-index.json.get.ts` — 新增 search index route，維持既有 `/search-index.json` URL。
- `scripts/content-reader.ts` — 保留為 Git-backed content source reader，供 server routes 與必要 build scripts 共用。
- `scripts/public-content.ts`、`scripts/public-payload/**` — 保留 public payload mapping，但呼叫端從 build script 轉為 server route。
- `app/utils/fetch-public-content-payload.ts` — 改為 universal fetch route，不再 server side 直接讀 `public/api/content.json`。
- `app/utils/search/client-search.ts` — 繼續 fetch `/search-index.json`，必要時提供 dev cache invalidation。
- `app/components/product-card.vue`、`app/components/product-detail.vue`、`app/components/resource-list.vue` — 將 `<img>` 改為 `<NuxtImg>` 或包裝後的 image component。
- `app/utils/content-images/resolve-image-file-url.ts` — 改為 resolve Nuxt Image source path，或由新 image view model 取代。
- `nuxt.config.ts` — 加入 `@nuxt/image` module、image source dir、Nitro prerender routes。
- `scripts/build-content-images.ts` — 移除 production 必要性；若保留，標記為 legacy 或只供 migration 使用。
- `tests/nuxt-smoke.test.ts`、`tests/public-discovery.test.ts`、`tests/search-index.test.ts`、`tests/build-content-images.test.ts` — 更新 API／圖片 pipeline contract。
- `README.md`、`docs/CONTENT.md`、`AGENTS.md` — 更新 content authoring 與 generate workflow 說明。

## 介面／資料結構（API / Data Structure）

Public API 維持 JSON over HTTP，但來源改成 Nuxt server route，並由 `nuxt generate` prerender。

```http
GET /api/content.json
Accept: application/json
```

Response shape 可調整，圖片不再輸出 generated WebP URL，而是輸出 source image metadata：

```json
{
  "products": {
    "cards": [
      {
        "id": "2026-06-02-sample-product",
        "name": "範例商品",
        "image": {
          "src": "/products/images/2026-06-02-sample-product.jpg",
          "alt": "範例商品"
        }
      }
    ],
    "details_by_id": {}
  },
  "guides": [],
  "links": [],
  "taxonomies": {},
  "navigation": {}
}
```

Search index route 維持既有 URL，降低 search client 變更範圍：

```http
GET /search-index.json
Accept: application/json
```

Search document 暫時保留 `image_url` 欄位以降低 search client 改動量，但欄位語意改為 Nuxt Image source URL，不再是自建 generated WebP URL。

Nuxt Image local source path 規則：

- Product source：`content/products/images/{file}`。
- Guide source：`content/guides/images/{file}`。
- 對外 image src 可用 alias 化路徑，例如 `/products/images/{file}`、`/guides/images/{file}`。
- UI 透過 `<NuxtImg :src="image.src" format="webp" ...>` 產生 IPX／static optimized URL。

## 邊界案例

- Case 1：JSON 暫時不合法。處理方式：API route 回 500／dev overlay 顯示錯誤，terminal log 保留 zod／JSON parse 訊息；不產生假資料。
- Case 2：Product 設為 `published` 但 `image_file` 指向不存在的圖片。處理方式：content reader 或 image view model build 階段失敗；dev 直接暴露錯誤，generate 失敗，避免 production 404。
- Case 3：圖片只在 client search 結果中出現，沒有被 prerender 頁面 render 到。處理方式：search result 使用的商品圖片必須也出現在首頁／category／detail 等 prerender 頁面，或明確加入對應 `_ipx` prerender routes。
- Case 4：外部 API 消費者直接使用 image src。處理方式：API 文件標示 image `src` 是網站 image source path，不保證是最終 optimized asset URL；若需要 optimized URL，應由本站 UI 或後續明確 API 欄位產生。
- Case 5：新增／封存 Product。處理方式：API route 即時反映 content source；production route 與 detail prerender 仍由 `nuxt generate` 驗證。

## ADR（Architecture Decision Record）

- 決策：Public content API 與 search index 改由 Nuxt server routes 產生，並透過 Nitro prerender 在 `nuxt generate` 輸出 static files。
- 原因：dev、generate、production API 邏輯同源，符合 Nuxt SSG 生態系；比 build script 寫入 `public/*.json` 更少 drift。
- 替代方案：保留 build script 寫入 `public/api/content.json` 與 `public/search-index.json`，再用 dev watcher 重建。排除原因：仍是自寫 artifact pipeline，dev 與 Nuxt server lifecycle 分離。
- 替代方案：只做 dev-only `server:devHandler`，production 維持 static generated files。排除原因：dev 與 production API 路徑仍分叉；既然 API contract 可改，應讓兩邊同源。
- 決策：圖片導入 `@nuxt/image`，以 IPX／static provider 取代自寫 `build-content-images.ts` 作為主要圖片 pipeline。
- 原因：圖片 resize、WebP、dev 即時處理與 generate static output 都是 Nuxt Image 的核心場景，可減少自維護 sharp script。
- 替代方案：把圖片納入 Vite `import.meta.glob`／`vite-imagetools`。排除原因：會讓 API payload 與 Vite asset manifest／hashed URL 耦合，對 JSON content source 與 SSG API 不如 Nuxt Image 直覺。
- 決策：不導入 `@nuxt/content`。
- 原因：專案已試過並因 bundle size 過大取消；本 sprint 只採用 Nuxt server routes 與 Nuxt Image，不導入 Content database。

## Milestones

### Milestone 1：Server routes 取代 generated JSON artifacts
> 預期結果：`/api/content.json` 與 `/search-index.json` 在 dev 由 Nuxt server routes 即時產生，generate 後出現在 `.output/public`。
> 驗證方式：`pnpm test tests/public-discovery.test.ts tests/search-index.test.ts tests/nuxt-smoke.test.ts`

- [ ] 撰寫／更新測試（Red）：驗證 server route handler 使用 `readPublicContentSource()` 與既有 payload／search mapping，且 `nuxt.config.ts` prerender routes 包含 `/api/content.json`、`/search-index.json`。
- [ ] 實作最小功能（Green）：新增 server routes，將 `fetchPublicContentPayload()` 改為 route fetch，移除 server side 直接讀 `public/api/content.json` 的 primary path。
- [ ] Refactor 並確認測試維持通過：讓 build script 與 server route 共用 mapping function，避免 duplicated payload 邏輯。

### Milestone 2：Nuxt Image content 圖片 pipeline
> 預期結果：Product／Guide 圖片由 `<NuxtImg>` 顯示，dev 不需 `build-content-images` 即可看到 source image，generate 會輸出 optimized static images。
> 驗證方式：`pnpm test tests/product-schema.test.ts tests/nuxt-smoke.test.ts tests/published-products/compact-app.test.ts tests/public-payload/map-product-card.test.ts tests/public-payload/map-product-detail.test.ts tests/public-payload/map-resource-rows.test.ts`

- [ ] 撰寫／更新測試（Red）：驗證 public payload image contract 改為 source image metadata，UI 使用 Nuxt Image，舊 `/images/products/*.webp` contract 不再是主要輸出。
- [ ] 實作最小功能（Green）：加入 `@nuxt/image` module，設定 local source dir／alias，改 Product card、detail、resource rows 使用 `<NuxtImg>`。
- [ ] Refactor 並確認測試維持通過：移除或降級 `build-content-images` 在 generate 前置流程中的必要性，更新相關文件與 workflow 測試。

### Milestone 3：SSG generate 與 dev authoring 驗收
> 預期結果：內容、search API 與圖片都可透過 Nuxt dev／generate lifecycle 驗證，不再要求 content 更新後手動跑多個 artifact build script 才能預覽。
> 驗證方式：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`，並在 `https://dwselect.toybox.local/` 手動確認內容與圖片可載入。

- [ ] 撰寫／更新測試（Red）：更新 static generate workflow 測試，確認 generate 不依賴舊的 `build:content-images`／`build:public-artifacts` 作為唯一 API／圖片來源。
- [ ] 實作最小功能（Green）：更新 package scripts、README、`docs/CONTENT.md`、AGENTS content authoring 指引。
- [ ] Refactor 並確認測試維持通過：執行完整品質閘門，手動打開主要頁面與商品詳情確認 SSG output 與 dev server 都可載入。
