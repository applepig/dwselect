# Sprint 6：DW嚴選 Compact App Redesign

## 目標

將 DW嚴選公開首頁從現有單頁 catalog 改造成 handoff C 路線「俐落清單」的 compact app。完成後，使用者可以在首頁、指南、搜尋、連結四個 tab 之間切換，用 phone bottom tab、tablet rail、desktop sidebar 瀏覽商品，並透過 light/dark theme、商品詳情 sheet / modal 與 View Transition 取得接近 handoff 的使用體驗。

本 sprint 採 schema-first。先把商品資料演進成可支撐 redesign 的穩定資料契約，再實作 UI，避免在 component 內重複推導 channel、category、價格與短評。

## 非目標

- 不回到 Google Sheets runtime fetch。
- 不新增 REST、SSE、WebSocket API。
- 不新增 CMS、inside editing UI 或後台管理介面。
- 不做價格歷史、價格監控或價格區間篩選。
- 不新增 `hot` 或「嚴選熱推」資料欄位；detail UI 可不顯示此 badge。
- 不匯入 handoff sample data 作為 production content。
- 不要求一次補齊所有商品長篇介紹；本 sprint 先用既有 `description` 作為安全 fallback。
- 不建立新 landing page；首頁第一屏就是可操作的 compact app。
- 不新增字體載入 dependency；CSS 可指定 `Noto Serif TC`、`Noto Sans TC` 與系統 fallback。

## User Story

作為 DW嚴選讀者，我想要用接近 app 的 compact interface 依分類、tag、搜尋與商品詳情瀏覽推薦商品，以便快速找到想研究或購買的品項。

作為內容維護者，我想要商品資料明確包含 channel、category、價格結構與短評，以便未來能穩定維護資料，而不是讓 UI 每次從 URL 或文案猜測。

### 驗收條件

- [x] `content/products/*.json` 仍有 66 筆商品，所有商品通過新版 `product_schema`，且 `id` 等於檔名 stem。
- [x] 商品 JSON 已移除舊 `category` 欄位，改以 `category_id` 指向 taxonomy definition。
- [x] 商品 JSON 已新增 `channel_id`、`summary`、`price`，其中 `price` 包含 `amount`、`currency`、`unit`、`label`。
- [x] `content/taxonomies/channels.json`、`content/taxonomies/categories.json`、`content/taxonomies/links.json` 存在並通過 schema 或 helper 測試。
- [x] 第一波 channel 僅包含 `pchome`、`momo`、`amazonjp`、`amazonus`、`costco`、`other`；其他 host migration 先落到 `other`。
- [x] 第一波 category definition 覆蓋真實分類並包含 fallback：`home`（居家）、`kitchen`（廚房）、`computer`（電腦）、`three-c`（3C）、`av`（影音）、`food`（食材）、`other`（其他）。空白或未知匯入分類必須歸到 `other`，且 migration summary 需提供 warning 或等價資訊。
- [x] `links.json` 第一版只有一筆連結，指向 `https://applepig.idv.tw`。
- [x] 價格解析不把 `￥`、`/kg`、美元文字、範圍或模糊文案誤判成單一 TWD 數字；無法安全解析時保留 `price_text` 與 `price.label`。
- [x] MiniSearch static index 納入 `name`、`summary`、`description`、category label、channel label、tags，且 static document count 與 published 商品數一致。
- [x] Compact app shell 具備四個 tab：首頁、指南、搜尋、連結；tab 切換不重新載入頁面；production 首頁 runtime 必須透過 Nuxt Content data collections 載入 `content/taxonomies/categories.json`、`channels.json`、`links.json`，再傳入 view-model。
- [x] Phone `<768px` 使用 sticky bottom tab bar；tablet `768–1199px` 使用 left rail；desktop `>=1200px` 使用 left sidebar。
- [x] Theme toggle 使用 Nuxt UI `UColorModeButton` 切換 light/dark，並套用 handoff 指定的 warm dark / warm light CSS tokens。
- [x] 首頁 tab 顯示 category chips 與 product grid；商品卡包含 image tile、channel badge、price chip、name、summary。
- [x] 指南 tab 顯示 tag chips，支援多選 AND filter，並能清除已選 tag。
- [x] 搜尋 tab 使用 Nuxt UI input，placeholder 為 `在找什麼嗎？™`；輸入查詢時 client 端載入 `/search-index.json` 的 MiniSearch static index 並以 result ids 回填商品卡；空狀態顯示熱門 tag，無結果顯示 playful empty state。
- [x] 連結 tab 顯示一筆 link row，點擊後以新分頁開啟 `https://applepig.idv.tw`。
- [x] 點擊商品卡會開啟詳情：phone 為 sheet / full-screen overlay，tablet 與 desktop 為 modal；內容包含 hero、channel、title、price、DW 怎麼說、tags、buy CTA 與 fine print；只有 `description !== summary` 時才顯示 description，避免重複呈現同一段文案。
- [x] Buy CTA 以新分頁開啟商品 `purchase_url`，並使用 `rel="noopener noreferrer"`。
- [x] Card 到 detail 的開啟與關閉在支援環境使用 View Transition API；不支援或 `prefers-reduced-motion` 時仍正常切換。
- [x] 觸控 hit target 不小於 44px，長商品名稱、長 summary、長 tag、長價格文案不會造成 UI 重疊或破版。
- [x] 實作前需查 Nuxt v4、Nuxt Content 3、Nuxt UI 4 官方文件，確認 `useAsyncData`、`queryCollection`、`useColorMode`、modal 與 generate 相關寫法仍符合最新版 API。
- [x] 所有新增或修改的 acceptance criteria 必須先有測試失敗，再實作到測試通過。
- [x] `pnpm test` 通過；完成後 `pnpm generate` 可產生 static site 與 `public/search-index.json`。
- [x] 若本 repo 尚未設定 Playwright，新增最小 Playwright smoke test 設定；至少覆蓋 compact app 首屏、tab 切換、商品詳情開關與 phone / tablet / desktop 主要 breakpoint。

## 相關檔案

- `docs/006-dwselect-compact-app-redesign/plan.md` — sprint 前置規劃與已確認決策。
- `docs/006-dwselect-compact-app-redesign/research.md` — 價格、通路、分類資料契約研究。
- `docs/design_handoff_dwselect_redesign/README.md` — C 路線「俐落清單」high-fidelity handoff。
- `content.config.ts` — Nuxt Content collection 設定。
- `content/products/*.json` — 商品 content SSOT，migration 主要目標。
- `content/taxonomies/channels.json` — 新增，通路 taxonomy definition。
- `content/taxonomies/categories.json` — 新增，分類 taxonomy definition。
- `content/taxonomies/links.json` — 新增，連結 tab 資料。
- `app/utils/product-schema.ts` — Product schema 與 taxonomy schema。
- `app/utils/published-products.ts` — Catalog / compact app view-model helper。
- `app/utils/search/search-index.ts` — MiniSearch document mapping 與 static index contract。
- `app/utils/search/client-search.ts` — client 端 static search index 載入。
- `scripts/build-search-index.ts` — static search index 產生。
- `scripts/migrate-product-compact-schema.ts` — 新增，一次性 schema migration script。
- `app/pages/index.vue` — compact app 入口。
- `app/components/product-card.vue` — 新增，商品卡。
- `app/components/product-detail.vue` — 新增，商品詳情 sheet / modal 內容。
- `app/components/app-navigation.vue` — 新增，phone bottom tab、tablet rail、desktop sidebar。
- `app/components/theme-toggle.vue` — 新增，light/dark toggle。
- `app/components/tag-explorer.vue` — 新增，指南 tab tag filter。
- `app/components/link-panel.vue` — 新增，連結 tab。
- `app/assets/styles/main.css`、`app/assets/styles/catalog.css`、`app/assets/styles/variables.css` — redesign tokens 與 responsive CSS。
- `tests/product-schema.test.ts` — schema 與真實 content 驗證。
- `tests/search-index.test.ts` — MiniSearch contract 驗證。
- `tests/published-products.test.ts` — view-model、分類、搜尋、tag filter 驗證。
- `tests/nuxt-smoke.test.ts` — Nuxt static、source contract、responsive CSS smoke 驗證。

## 介面／資料結構（API / Data Structure）

本 sprint 不新增 REST、SSE 或 WebSocket。資料通訊協定維持 Nuxt Content static data collection 與 static JSON search index。

### Product

```ts
type ProductPrice = {
  amount: number | null
  currency: 'TWD' | 'JPY' | 'USD' | null
  unit: 'each' | 'kilogram' | null
  label: string | null
}

type Product = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  name: string
  price_text: string
  price: ProductPrice
  summary: string
  description: string
  purchase_url: string
  image_url: string
  channel_id: string
  category_id: string
  tags: string[]
  reference_url: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
}
```

Product migration 規則：

- `summary` 從既有 `description` 複製。
- `description` 暫時保留既有 `description`。
- `channel_id` 由 `purchase_url` host 一次性推導並寫回 JSON。
- `category_id` 由舊 `category` 中文名稱對應至 `categories.json`。
- migration 完成後移除舊 `category`。
- `price_text` 保留原值。
- `price.amount` 只在可安全解析為單一價格時填入。
- `price.currency` 以 ISO 4217 三碼貨幣代碼表示。
- `price.unit` 至少支援 `each` 與 `kilogram`。
- `price.label` 用於範圍、模糊價格、美元文字或覆蓋顯示。

### Channel Definition

```ts
type ChannelDefinition = {
  id: 'pchome' | 'momo' | 'amazonjp' | 'amazonus' | 'costco' | 'other'
  label: string
  tint: string
  host_patterns: string[]
  sort_order: number
}
```

第一波 host mapping：

- `24h.pchome.com.tw` → `pchome`
- `www.momoshop.com.tw` → `momo`
- `www.amazon.co.jp`、`amzn.asia` → `amazonjp`
- `www.amazon.com` → `amazonus`
- `www.costco.com.tw` → `costco`
- 其他 host → `other`

### Category Definition

```ts
type CategoryDefinition = {
  id: 'home' | 'kitchen' | 'computer' | 'three-c' | 'av' | 'food' | 'other'
  label: string
  short_label: string
  sort_order: number
}
```

第一波 category mapping：

- `居家` → `home`
- `廚房` → `kitchen`
- `電腦` → `computer`
- `3C` → `three-c`
- `影音` → `av`
- `食材` → `food`
- 空白或未知分類 → `other`，且 migration / importer summary 需記錄 warning 或等價資訊，避免維護者不知資料已 fallback。

### Link Definition

```ts
type LinkDefinition = {
  id: string
  title: string
  subtitle: string
  url: string
  icon: string
  sort_order: number
}
```

第一版資料：

```json
[
  {
    "id": "applepig-home",
    "title": "applepig.idv.tw",
    "subtitle": "DW 的主站",
    "url": "https://applepig.idv.tw",
    "icon": "i-lucide-link",
    "sort_order": 10
  }
]
```

### Search Index Payload

```ts
type SearchDocument = {
  id: string
  name: string
  summary: string
  description: string
  category_id: string
  category_label: string
  channel_id: string
  channel_label: string
  tags: string[]
  price_text: string
  image_url: string
  published_at: string | null
}
```

Search fields 至少包含 `name`、`summary`、`description`、`category_label`、`channel_label`、`tags`。Store fields 至少包含 `id`、`name`、`category_label`、`channel_label`、`price_text`、`image_url`。

## 邊界案例

- 價格為 `125/kg`、`200/kg`：`amount` 為數字，`currency` 可依台灣通路推定為 `TWD`，`unit` 為 `kilogram`，顯示時保留 `/kg` 語意。
- 價格為 `￥100000`、`￥1790`：`currency` 為 `JPY`，不得顯示成 `TWD`。
- 價格為 `20~30鎂`、`8000鎂`：不得當成單一 TWD；`currency` 可為 `USD`，若範圍無法安全表示則 `amount` 為 `null`，`label` 保留原文。
- 價格為 `249~349`、`28000~32000`、`低於60000`、`大概16000`、`比較貴一點`、`あるよー`：`amount` 為 `null`，`label` 保留原文。
- `purchase_url` host 不在第一波 channel mapping：`channel_id` 必須為 `other`，且 UI 仍能顯示通路 badge 與 buy CTA。
- 商品引用不存在的 `category_id` 或 `channel_id`：schema/helper 測試必須失敗。
- Production 首頁 taxonomy metadata 載入失敗或尚未載入時，可使用 hardcode defaults 作 fallback；正常 runtime path 必須 query Nuxt Content taxonomy JSON，避免 UI labels 或 links 與 `content/taxonomies/*.json` 分歧。
- 搜尋 index 載入失敗：搜尋 tab 與首頁仍可用已載入的 Nuxt Content 商品資料瀏覽，不因 client search failure 白屏。
- 搜尋 index 載入成功但沒有結果：搜尋 tab 顯示 playful empty state；載入成功且有結果時，商品卡順序與範圍以 MiniSearch result ids 為準。
- 商品 detail 的 `summary` 與 `description` 相同：只顯示 `DW 怎麼說`，不重複顯示 description 段落。
- 使用者選取多個 tag 後沒有商品符合：指南 tab 顯示 empty state，並提供清除選取。
- 長商品名稱、長 tag、長 summary 或長價格 label：UI 需要換行、ellipsis 或 line clamp，不可撐破卡片、chip、modal 或 navigation。
- 瀏覽器不支援 View Transition API 或使用者設定 reduced motion：detail 開關仍正常，只略過 morph animation。
- 只有 draft / unpublished / archived 商品時：compact app 顯示空狀態，search index 不包含非 published 商品。

## ADR（Architecture Decision Record）

### ADR 1：採用 schema-first，而不是 UI runtime 推導

- 決策：先演進 Product schema、migration content JSON 與 search contract，再實作 compact app UI。
- 原因：`channel_id`、`category_id`、結構化價格與 `summary` 都是 domain data，不應在 UI helper 內每次從 URL 或字串推導。
- 替代方案：UI-first runtime 推導。排除原因是會把資料規則藏進 component，之後 inside editing 或二次 migration 還要重做一次。

### ADR 2：Product 移除舊 `category`，只保留 `category_id`

- 決策：migration 後直接移除舊中文 `category` 欄位。
- 原因：分類 metadata 需要排序、顯示名稱與未來 icon / color，不適合以中文 label 當資料關聯鍵。
- 替代方案：同時保留 `category` 與 `category_id`。排除原因是會形成雙重真相來源，未來資料可能不同步。
- 風險處理：本 sprint 明確允許破壞式 content migration；若 migration 出問題，以 Git 回溯。

### ADR 3：價格使用多幣別／單位／label 模型

- 決策：使用 `price.amount`、`price.currency`、`price.unit`、`price.label`。
- 原因：真實資料同時包含 TWD 純數字、JPY、美元文字、每公斤價格、範圍與模糊文案，單一 `price_value` 無法正確表達。
- 替代方案：只存 `price_value: number | null`。排除原因是會丟失幣別、單位與覆蓋顯示語意。

### ADR 4：Taxonomy definition 放在 `content/taxonomies/`

- 決策：`channels.json`、`categories.json`、`links.json` 放在 `content/taxonomies/`。
- 原因：這些檔案是內容資料與 UI metadata 的 SSOT，與 Product content 同層級，且不只是 enum。
- 替代方案：硬編在 component 或 TypeScript const。排除原因是 content 與 UI 會耦合，未來內容維護不方便。

### ADR 5：Links tab 第一版只放 applepig 主站

- 決策：`links.json` 第一版只有一筆 `https://applepig.idv.tw`。
- 原因：使用者已確認先做單一連結，避免為未確認的 FB 或分類總覽連結擴大 scope。
- 替代方案：照 handoff 放三筆 sample links。排除原因是 sample 內容不是本 sprint 已確認 production content。

### ADR 6：以現有 Nuxt 4 架構實作 handoff，而不是移植 prototype code

- 決策：保留 Nuxt 4、Nuxt UI 4、Nuxt Content 3 與 MiniSearch static index；handoff prototype 只作為設計與行為參考。
- 原因：prototype 是 HTML/React inline reference，不是 production code；現有專案已完成 static generate 與 Nuxt Content cutover。
- 替代方案：直接搬 prototype 結構或新增前端框架。排除原因是會偏離既有技術棧與專案 pattern。

### ADR 7：實作前查 Nuxt v4 官方文件

- 決策：進入實作前，先查 Nuxt v4、Nuxt Content 3、Nuxt UI 4 官方文件。
- 原因：使用者指出 Nuxt v4 近期改動快；`queryCollection`、`useColorMode`、modal 與 generate API 需要以官方文件確認。
- 替代方案：只依照既有程式碼與記憶實作。排除原因是容易踩到近期 API 變更。

## Milestones

### Milestone 1：Schema evolution、taxonomy 與 content migration

> 預期結果：66 筆商品 content 轉為新版 Product schema，taxonomy JSON 成為 channel、category、links 的唯一資料來源。
> 驗證方式：`pnpm test tests/product-schema.test.ts`、`pnpm test tests/published-products.test.ts`

- [x] 查 Nuxt v4、Nuxt Content 3、Nuxt UI 4 官方文件，記錄任何會影響實作的 API 注意事項到 `works.md`。
- [x] 撰寫／更新 `tests/product-schema.test.ts`，先驗證新版 Product schema、taxonomy schema、66 筆 content、`id` 等於檔名 stem、舊 `category` 已移除。
- [x] 撰寫 migration helper 測試，涵蓋 channel inference、category mapping、price parsing edge cases 與 unknown host fallback。
- [x] 新增 `content/taxonomies/channels.json`、`categories.json`、`links.json`。
- [x] 新增一次性 `scripts/migrate-product-compact-schema.ts`，執行 content migration。
- [x] 更新 `app/utils/product-schema.ts` 與相關 type。
- [x] 更新 `app/utils/published-products.ts`，讓 view-model 使用 category/channel definition 與 `summary`。
- [x] 執行 migration，確認 `content/products/*.json` 全部符合新版 schema。
- [x] Refactor 並確認測試維持通過。

### Milestone 2：Search contract 與 static generate 更新

> 預期結果：MiniSearch static index 使用新版 Product contract，搜尋結果仍與 published 商品數一致。
> 驗證方式：`pnpm test tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts`

- [x] 撰寫／更新 search tests，先驗證 `summary`、`description`、category label、channel label、tags 都可搜尋。
- [x] 更新 `app/utils/search/search-index.ts` 的 document mapping、store fields 與 suggestion mapping。
- [x] 更新 `scripts/build-search-index.ts`，確保 filename stem override 與新版 schema 一致。
- [x] 更新 `public/search-index.json` 產物。
- [x] 更新 Nuxt smoke tests，移除舊 `category` 字串契約，改驗證 taxonomy 與 search-index 新欄位。
- [x] Refactor 並確認測試維持通過。

### Milestone 3：Compact app shell 與四個 tabs

> 預期結果：`app/pages/index.vue` 成為 compact app，能在首頁、指南、搜尋、連結四個 tab 間切換，並具備 responsive navigation 與 light/dark theme。
> 驗證方式：`pnpm test tests/published-products.test.ts tests/nuxt-smoke.test.ts` 與 Playwright smoke tests。

- [x] 撰寫／更新 view-model tests，先驗證 home category filter、guide AND tag filter、search tab query、top tags、link panel data。
- [x] 撰寫／更新 source、component 或 Playwright smoke tests，先驗證四個 tabs、navigation breakpoints、theme toggle、搜尋 placeholder 與 links row。
- [x] 拆出 `AppNavigation`、`ThemeToggle`、`ProductCard`、`TagExplorer`、`LinkPanel`。
- [x] 重構 `app/pages/index.vue`，維持 `useAsyncData` + `queryCollection('products')` 的 static content 來源。
- [x] 建立 light/dark CSS variables，落實 handoff tokens，避免 UI 變成單一色系。
- [x] 實作 phone bottom tab、tablet rail、desktop sidebar 與 sticky top bar。
- [x] 實作首頁 category chips、product grid、指南 tag chips、搜尋 empty/results/no-results、連結單筆 row。
- [x] Refactor 並確認測試維持通過。

### Milestone 4：Product detail、View Transition 與 responsive polish

> 預期結果：點擊商品卡可開啟 detail sheet / modal，並能正常購買外連；支援 View Transition 與 reduced-motion fallback。
> 驗證方式：`pnpm test`、`pnpm generate` 與 Playwright responsive smoke tests。

- [x] 撰寫／更新 tests，先驗證 detail 所需 view-model 欄位、buy CTA label、外連安全屬性、View Transition fallback helper。
- [x] 新增 `ProductDetail`，實作 phone sheet 與 tablet/desktop modal 行為。
- [x] 實作 detail hero、channel badge、title、price、DW 怎麼說、tags、buy CTA、fine print。
- [x] 實作 card → detail 的 View Transition；不支援 API 或 reduced motion 時走同步狀態切換。
- [x] 檢查長文字、長 tag、長價格 label、空搜尋結果、空 tag filter 的版面。
- [x] 以 Playwright 檢查 phone、tablet、desktop breakpoint 的首屏、detail overlay 與主要互動沒有重疊或白屏。
- [x] 執行 `pnpm test` 與 `pnpm generate`。
- [x] 更新 `spec.md` Milestones 狀態與 `works.md`，等待使用者確認後才 commit。

### Milestone 5：XReview confirmed issues 修正

> 預期結果：首頁 runtime 使用 MiniSearch static index 與 taxonomy JSON；detail 不重複 description；schema / migration / importer 支援 `other` category fallback。
> 驗證方式：`pnpm test tests/product-schema.test.ts tests/published-products.test.ts tests/search-index.test.ts tests/client-search.test.ts tests/nuxt-smoke.test.ts tests/migrate-google-sheet-products.test.ts tests/migrate-product-compact-schema.test.ts`

- [x] 更新 tests，先覆蓋搜尋 tab static index result ids、index failure fallback、Nuxt Content taxonomy collections、detail description 條件式顯示、`other` category schema / view-model / search / migration / importer。
- [x] 更新 `content.config.ts` 註冊 categories、channels、links data collections，首頁 runtime query taxonomy JSON 並傳入 view-model。
- [x] 更新搜尋 tab，呼叫 `getClientSearchResults()` 載入 `/search-index.json`，成功時以 result ids 回填商品卡，失敗時 fallback 到 Nuxt Content 已載入商品資料。
- [x] 更新 `getProductDetail()` / `ProductDetail`，只有 description 與 summary 不同時顯示 description。
- [x] 新增 `other` category taxonomy、Product schema enum、migration mapping 與 Google Sheet importer warning。
- [x] 執行指定測試並更新 `works.md`。
