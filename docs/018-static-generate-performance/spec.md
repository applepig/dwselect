# Static Generate Performance & Lighter Runtime

## 目標

降低 DW嚴選的 `pnpm generate` build 成本與公開站 client 端負載，重點是**收斂成單一 content 存取層**並移除「靜態站不該有」的 runtime 重量（in-browser SQLite、build 時外部字型 fetch、未優化圖片），並讓 CI build 可重用 cache。目前同一份 `content/*.json` 存在兩種讀法（build 端輕量 fs+zod 的 `content-reader.ts`、runtime 端重量 Nuxt Content SQLite），本 sprint 讓 runtime 也走輕量靜態路徑、收掉重複引擎。內容 SSOT 仍是 `content/` 下的 JSON 與 taxonomy；本 sprint 不改內容資料 schema 與資料內容。

## 非目標

- 不改商品／指南／連結的 content model、欄位或資料內容。
- 不引入 SSR、Cloudflare Functions、Workers 或任何 runtime 動態後端；維持 `nitro.preset: 'static'` SSG。
- 不改既有 search index（`public/search-index.json`）與 discovery（`public/api/content.json`、`sitemap.xml`、`rss.xml`、`robots.txt`、`llms.txt`）的輸出 schema。
- 不在公開站 runtime 新增任何外部 fetch（字型、圖片、CDN transform 一律 build-time 處理或 same-origin）。
- 不導入需付費啟用的 Cloudflare Image Resizing / Images 產品。

## 背景與量測 baseline

實測（62 商品，本機 Docker 外環境，Node 22）：

| 階段 | Cold | Warm |
|---|---|---|
| `build:search-index` | 0.23s | 0.23s |
| Client Vite build | 12.0s | 10.4s |
| Server Vite build | 10.9s | 7.5s |
| Nitro prerender（141 routes）| 14.9s | 10.6s |
| **`pnpm generate` 總計** | **44s** | **32.5s** |

關鍵觀察：

1. **Client 端被打包了 in-browser SQLite。** `.output/public/_nuxt/` 內有兩份 byte-identical 的 `sqlite3*.wasm`（各 856KB，md5 相同；一份 main-thread、一份 worker）、`sqlite3-worker1-bundler-friendly` worker（~197KB），加上 `__nuxt_content/<collection>/sql_dump.txt` × 7（products 20KB）。這是 Nuxt Content v3 為了 client 端 `queryCollection` 而附帶的查詢引擎。對 62 筆靜態目錄而言過重，且本質上「不靜態」。
2. **每頁 payload 內嵌全部 catalog。** `products/<id>/_payload.json` 各 83KB，62 頁 ≈ 5MB；因為 detail 頁透過 `useCatalogData()` → `queryCollection` 載入全部商品。隨商品數成長為 O(N²)。
3. **字型在 build 時打外部 provider。** `@nuxt/ui` 帶的 `@nuxt/fonts` 解析 `Inter` / `Noto Sans TC` 時會打 `fonts.google.com` / `api.fontshare.com` / `api.fontsource.org`。離線時重試後 403，且輸出**完全沒有 woff2、靜默退回 system font**——字型結果取決於 CI 當下有無網路，非 deterministic。
4. **CI 無 build cache。** `.github/workflows/static-generate.yml` 只 `cache: pnpm`，未快取 `node_modules/.cache/nuxt`（實測 21MB），故每次 CI 都是 cold build（量測 cold→warm 差約 10–12s）。
5. **圖片未優化。** `content/products/images` 共 5.6MB／62 張，多為原檔 JPG（最大 422KB），以 raw `publicAssets` 原檔直送，無 resize、無 responsive、無 next-gen 轉檔。對 build 影響小，但是公開站 LCP 的最大成本。
6. **既有可重用地基，但出現兩條 content 存取路徑並存（核心 smell）。** 016 sprint 已有 `scripts/content-reader.ts`（純 fs + zod 讀 `content/*.json`，零 Nuxt Content / SQLite 依賴），`scripts/build-search-index.ts` 與 `scripts/build-public-discovery.ts` 皆已收斂使用它，並在 build pipeline 產出 `public/api/content.json`（108KB，完整 published catalog + taxonomy）。然而 **app runtime（`use-catalog-data.ts`）仍走另一條路徑——Nuxt Content 的 `queryCollection`（SQLite 引擎）**。同一份 `content/*.json` 因此存在「兩種讀法」：build 端輕量 fs+zod、runtime 端重量 SQLite。site content 目前 100% 為 JSON（唯一 `.md` 是 `content/AGENTS.md` 指示文件，非站台內容），Nuxt Content 的 markdown 渲染管線未被使用，使其成為這台車上多餘的重引擎。本 sprint 的核心是**收斂成單一 content 存取層**：讓 runtime 也讀 `content-reader` 產出的靜態 catalog，移除 Nuxt Content 這條重量路徑。

## User Story

作為站點維護者，我想要更快、更可重現的 build，以及更輕、更名副其實「靜態」的公開站，以便內容成長時 generate 不會線性惡化、使用者載入不需下載查詢引擎，且字型與圖片不依賴 build 時的外部服務。

### 驗收條件

- [ ] 公開站 client bundle 不再包含 SQLite WASM / worker，`.output/public/_nuxt/` 無 `sqlite3*.wasm`；`.output/public/__nuxt_content/` 不再作為 client runtime 查詢來源。
- [ ] List / detail 頁面的 runtime 資料來源改為既有靜態 `public/api/content.json`（或等價 build-time 靜態 JSON），不在 client-reachable 程式碼呼叫 Nuxt Content 的 `queryCollection`。
- [ ] 商品 detail 頁的 prerender payload 不再內嵌全部 catalog；單頁 `_payload.json` 顯著小於現況 83KB，且不隨商品總數線性增長。
- [ ] 字型改為 deterministic、build 時零外部 fetch：採系統 CJK stack（不 self-host CJK webfont），拉丁顯示字（Inter）若保留則以 self-host 子集提供；generate log 不再出現 font provider 連線重試。
- [ ] `.github/workflows/static-generate.yml` 新增 Nuxt build cache（`node_modules/.cache/nuxt` 等）的 `actions/cache` 步驟，cache key 對應 lockfile 與相關 source。
- [ ] 商品圖片改為 build-time 優化（resize + next-gen 格式），公開站圖片仍為 same-origin 靜態資產、無 runtime 外部 transform；現有頁面圖片顯示不破。
- [ ] 既有測試與品質閘門（`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`）全綠；新增測試覆蓋上述契約。
- [ ] `pnpm generate` 後實際開啟首頁、商品列表、商品詳情、搜尋、指南、連結頁人工確認可載入且主要互動正常（依 CLAUDE.md Frontend Handoff）。

## 相關檔案

- `app/composables/use-catalog-data.ts` — 目前以 `useAsyncData` + `queryCollection` 載入 catalog；需改為讀靜態 `content.json`。
- `app/pages/index.vue`、`app/pages/search.vue`、`app/pages/guide.vue`、`app/pages/links.vue`、`app/pages/products/[id].vue`、`app/layouts/default.vue`、`app/components/app-navigation.vue` — 皆消費 `useCatalogData()`，連帶 detail 頁 related products 取資料邏輯。
- `content.config.ts`、`nuxt.config.ts`（`modules` 含 `@nuxt/content`）— 評估 Nuxt Content 是否降為 build-only 或移除。
- `scripts/content-reader.ts`、`scripts/public-content.ts`、`scripts/build-public-discovery.ts` — 既有靜態 catalog 來源，作為 runtime data source 重用。
- `app/assets/styles/variables.css` — `font-family` 宣告；字型策略調整點。
- `.github/workflows/static-generate.yml` — 新增 build cache 步驟。
- `scripts/localize-content-images.ts`、`content/products/images/`、`nuxt.config.ts`（`nitro.publicAssets`）— 圖片優化管線與輸出。
- `package.json` — 可能新增 image 優化 / 字型相關 scripts 或依賴。

## 介面／資料結構

本 sprint 不新增 runtime API。runtime data source 介面：

- 來源：build-time 產出的靜態 `GET /api/content.json`（schema 沿用 016 的 `PublicContentPayload`：`version` / `site` / `products` / `guides` / `links` / `taxonomies`）。
- 消費：`useCatalogData()` 改以同源 fetch / build-time import 取得 payload，回傳既有 `all_products` / `runtime_taxonomies` / `runtime_guides` / `runtime_links` view-model 介面不變，下游元件不需改 API。
- payload 策略：detail 頁只需「該商品 + 其 related products + taxonomy」，避免把整包 catalog 序列化進每頁 `_payload.json`。

## 邊界案例

- Case 1：detail 頁 related products 需跨商品查找。處理：related 計算在 build/prerender 時完成並只序列化結果，不把全 catalog 帶進 client payload。
- Case 2：移除 Nuxt Content 後 `queryCollection` auto-import 消失導致殘留呼叫編譯失敗。處理：全面改用新 data source；以測試斷言 client-reachable 程式碼不再 import client `queryCollection`。
- Case 3：CI build cache stale 造成輸出不一致。處理：cache key 納入 `pnpm-lock.yaml` 與 `content/**`、`app/**`、`nuxt.config.ts` 的 hash；cache 僅作加速，未命中時行為與現況一致。
- Case 4：CJK 改系統字後，未安裝對應字型的環境 fallback。處理：font stack 提供多層 fallback（`PingFang TC` / `Microsoft JhengHei` / `Noto Sans TC` / `sans-serif`）；視覺以常見繁中裝置為準人工確認。
- Case 5：圖片優化改變檔名 / 路徑造成既有引用 404。處理：保持輸出 URL 契約或同步更新引用；以 generate 後人工開頁與測試覆蓋。
- Case 6：離線 build。處理：字型與圖片全部 build-time 本地處理，不得依賴外部 provider，offline 仍能產出完整輸出。

## ADR（Architecture Decision Record）

### ADR 1：runtime 改讀靜態 `content.json`，移除 client 端 Nuxt Content 查詢

- 決策：list / detail 頁 runtime 資料來源由 Nuxt Content client `queryCollection` 改為既有 build-time 靜態 `public/api/content.json`。
- 原因：公開站是 62 筆量級的靜態目錄，client 端不需要 SQL 查詢引擎；改讀靜態 JSON 可同時移除 ~1.7MB SQLite WASM + worker + sql_dump，並切斷每頁 payload 內嵌全 catalog 的 O(N²)。016 已產出該靜態檔，重用成本低。
- 替代方案：(a) 維持 Nuxt Content 但設法只在 build 用——client `queryCollection` 的 import 仍會把 WASM 拉進 bundle，無乾淨開關，排除；(b) 直接做 byte 層 dedup 兩份 wasm——只治標、仍送查詢引擎，排除。

### ADR 2：Nuxt Content 降為 build-time only 或移除（分階段評估）

- 決策：先以 ADR 1 切斷 client 依賴；site content 既為 100% JSON、markdown 管線未用，後續評估完全移除 `@nuxt/content`（連帶 `better-sqlite3`）。
- 原因：移除可省 client bundle、build 中的 content DB 處理與一個 native 依賴；驗證已由 `product-schema.ts`（zod）與 `content-reader.ts` 覆蓋。
- 替代方案：保留 Nuxt Content 以備未來 markdown 內容。排除原因是目前無 markdown 站台內容，保留即持續付出 SQLite 成本；若未來需要可再導入。先做 ADR 1 的安全切斷，移除與否在 works.md 記錄決議。

### ADR 3：字型 deterministic 化，CJK 走系統字、拉丁字 self-host 子集

- 決策：不 self-host CJK webfont（Noto Sans TC 完整 woff2 數 MB，即使按 `unicode-range` 切片，常用繁中子集仍達數百 KB），改用系統 CJK stack；若保留 Inter 作拉丁顯示字，則 build-time self-host latin 子集，零外部 provider fetch。
- 原因：符合「runtime 不依賴外部 fetch」原則並延伸到 build；消除 `@nuxt/fonts` provider 重試與「靜默 fallback」不確定性；系統 CJK 在繁中裝置上原生且零位元組成本。
- 替代方案：(a) 用 `@fontsource/noto-sans-tc` 子集 self-host——體積仍偏大，僅在品牌強制特定字面時考慮；(b) 對實際內容字符做 build-time CJK subset（fonttools / glyphhanger）——可極小化，列為「必須自訂 CJK 字面」時的後備方案。

### ADR 4：圖片 build-time 優化，不採 runtime CDN transform

- 決策：商品圖片以 build-time resize + next-gen（webp/avif）優化（`@nuxt/image` `ipxStatic` 或 sharp build step），輸出 same-origin 靜態資產，交由 Cloudflare Pages 免費 CDN 快取。
- 原因：維持 SSG 與「無 runtime 外部 fetch」；Cloudflare Image Resizing（`/cdn-cgi/image/`）為需付費啟用的 runtime transform，不符非目標。
- 替代方案：Cloudflare Image Resizing / Images——付費且為 runtime 依賴，排除；純 CF CDN 不轉檔不 resize，無法解決原檔過大，排除為單獨方案。

### ADR 5：CI 新增 Nuxt build cache

- 決策：workflow 以 `actions/cache` 快取 `node_modules/.cache/nuxt`（與 `.nuxt`），key 綁 lockfile 與 source hash。
- 原因：CI 目前每次 cold build，實測 cold→warm 約省 10–12s；cache 僅加速，未命中行為等同現況，風險低。
- 替代方案：不快取——持續付 cold build 成本，排除。

## Milestones

### Milestone 1：runtime 改讀靜態 catalog，移除 client SQLite

> 範圍：`use-catalog-data.ts` 改讀 `content.json`；detail 頁 related 計算與 payload 瘦身；移除 client `queryCollection` 依賴。
> 驗證：`.output/public/_nuxt` 無 `sqlite3*.wasm`；單頁 `_payload.json` 明顯變小且不隨商品數線性成長；各頁人工開啟正常。
> 預期結果：公開站 client 不再下載查詢引擎，payload 去除全 catalog 重複。

- [ ] Red → Green → Refactor

### Milestone 2：Nuxt Content 移除與否決議

> 範圍：評估並（視決議）移除 `@nuxt/content` / `better-sqlite3`、`content.config.ts`、相關 import 與測試。
> 驗證：移除後品質閘門全綠，prerender routes 仍由 `buildProductRoutes` 正常產生。
> 預期結果：build 不再做未使用的 content DB 處理，或明確記錄保留理由。

- [ ] Red → Green → Refactor

### Milestone 3：字型 deterministic 化

> 範圍：`variables.css` font stack；移除／pin `@nuxt/fonts` provider 行為；（若保留 Inter）self-host latin 子集。
> 驗證：generate log 無 font provider 重試；offline build 仍可產出；繁中與拉丁文字人工確認顯示正常。
> 預期結果：字型結果可重現、零外部 fetch。

- [ ] Red → Green → Refactor

### Milestone 4：圖片 build-time 優化

> 範圍：圖片 resize + next-gen 轉檔管線；頁面圖片引用與 `publicAssets` / `@nuxt/image` 接線。
> 驗證：輸出圖片總量與單張大小下降；頁面圖片不破；無 runtime 外部 transform。
> 預期結果：公開站圖片負載顯著下降，仍為靜態 same-origin。

- [ ] Red → Green → Refactor

### Milestone 5：CI build cache

> 範圍：`.github/workflows/static-generate.yml` 的 `actions/cache` 步驟。
> 驗證：workflow 第二次以上執行能命中 cache 並縮短 generate；未命中時行為與現況一致。
> 預期結果：CI build 由 cold 轉 warm，省約 10–12s/run。

- [ ] Red → Green → Refactor

## Spec Self-Review

- 需求完整性：涵蓋使用者提出的字型（CJK 體積）、避免打包 SQLite 的更輕方法、圖片 CDN / `@nuxt/image`，以及先前已測得的 CI build cache 與 payload O(N²) 問題。
- Placeholder 掃描：無 TBD；量測數據為實測，Cloudflare 付費 transform 明列為非目標。
- 內部一致性：目標、驗收條件、ADR 與 Milestones 對齊「靜態、無 runtime 外部 fetch、deterministic build」三主軸。
- Scope 檢查：聚焦 build 效能與 client 輕量化，不動內容 schema 與資料；Nuxt Content 移除採分階段決議降低風險。
- 歧義檢查：runtime data source 明確指向既有 `content.json`；圖片明確排除 Cloudflare Image Resizing；字型明確以系統 CJK 為主。
