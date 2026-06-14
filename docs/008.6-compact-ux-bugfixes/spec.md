# Compact UX Bugfixes

## 目標

修正 compact app 目前幾個已知 UX 問題，讓首頁分類、商品詳情、指南／連結列表與搜尋頁在資料狀態、視覺一致性與互動模式上更符合實際使用：

- 首頁 category pills 不顯示 0 筆分類，避免無效 filter 佔位。
- 商品詳情頁以 1:1 商品圖呈現，不裁切商品圖。
- 商品詳情頁新增「You may also like」推薦區塊，提供至少 3 筆可點擊商品建議。
- 指南與連結頁共用一致的 list / row 排版與 gap。
- 搜尋頁改為「輸入／補完」與「提交搜尋」分離的狀態機，搜尋結果上下分成商品、指南、連結三區，並以一致的橫版 row 顯示。
- Link content 支援 optional `image_url`，讓連結 row 可和商品／指南 row 對齊顯示 1:1 圖片。

## 非目標

- 不新增外部搜尋服務、CMS、Google Sheets fetch 或 runtime 外部資料來源；仍使用 Git-backed `content/` 與 `public/search-index.json`。
- 不大改商品、指南、連結的 content schema；本 sprint 只允許為 Link 新增 optional `image_url`，推薦與搜尋其餘部分使用既有欄位。
- 不導入跨裝置同步搜尋紀錄；搜尋紀錄只存在目前瀏覽器。
- 不重做全站視覺設計或 navigation 架構；只收斂本 sprint 相關頁面與 component。
- 不把推薦演算法做成可設定後台或 ML；本 sprint 採可測、可解釋的 deterministic scoring。

## User Story

作為 dwselect 的訪客，我想要首頁只看到有內容的分類、商品詳情圖完整顯示、詳情頁能繼續探索相似商品，並用更清楚的搜尋流程找到商品／指南／連結，以便更快找到值得看的內容。

### 驗收條件

- [x] 首頁 `category_chips` 保留「全部」，但隱藏 count 為 0 的一般分類；未上架或 draft 商品不可讓分類 count 增加。
- [x] 桌面 sidebar 的商品分類入口同樣不顯示 count 為 0 的分類，避免 sidebar 與首頁分類 pills 不一致。
- [x] 首頁 pills 與 desktop sidebar 必須共用同一個 category count/filter 來源，避免兩處各自計算後再次分歧。
- [x] 商品詳情 hero image 使用 1:1 容器，圖片以 `object-fit: contain` 不裁切方式顯示；本 sprint 涉及的新／調整後 1:1 圖片 layout 都採 contain。
- [x] 商品詳情頁在主要內容下方顯示「You may also like」區塊；有足夠 published 商品時顯示至少 3 筆，排除目前商品，點擊後進入對應 `/products/:id`。
- [x] 「You may also like」可沿用商品卡片語彙，但尺寸需比首頁小或欄位更精簡，避免 detail 頁下方推薦區喧賓奪主。
- [x] 推薦排序 deterministic：同分類優先、shared tag 數越多越前、同 channel 加分、`published_at` 較新優先，最後以名稱穩定排序；不足 3 筆時用其他 published 商品補齊。
- [x] 商品數不足時推薦區塊不顯示目前商品；若除目前商品外沒有其他 published 商品，整個推薦區塊不顯示。
- [x] 指南頁與連結頁使用同一套 list / row component 或同一套 row data contract；區塊間 gap、row padding、左側 image/icon 欄位、action 欄位與 empty state 視覺一致。
- [x] Link schema 支援 optional `image_url`；有圖片的連結 row 左側顯示 1:1 contain 圖片，沒有圖片時顯示 icon fallback。
- [x] 搜尋頁初始進入 `/search` 且沒有 `q` 時，只顯示搜尋框與搜尋紀錄；若沒有紀錄，顯示可操作的熱門 tag／空狀態，不立即顯示搜尋結果。
- [x] 熱門 tag 來源為 published products／guides／links 的 `tag_ids` 統計，排序為 count desc、label asc，最多 10 筆；點擊熱門 tag 以 tag label 提交搜尋並更新 `/search?q=`。
- [x] 搜尋框有字但尚未提交時，搜尋紀錄區改為 autocomplete；autocomplete 可混合商品、指南、連結建議，採比搜尋結果更簡潔的 simple list view，標示類型，最多顯示 12 筆。
- [x] 按 Enter 或點擊 autocomplete／搜尋紀錄項目後，才進入搜尋模式並更新 `/search?q=<query>`；單純 typing 不應 debounce 改 URL。
- [x] `q` trim 後為空時等同沒有 `q`，維持 idle，不搜尋、不寫入搜尋紀錄、不顯示 no-results。
- [x] 搜尋模式結果上下分三區：商品、指南、連結。三區都使用一致的橫版 row/list UI；商品 row 左側顯示商品圖，指南／連結 row 左側優先顯示圖片，沒有圖片時顯示 icon。
- [x] 搜尋結果區塊順序固定為商品、指南、連結；每個可見區塊 heading 顯示 count，沒有項目的區塊整區跳過。
- [x] 搜尋模式無結果時顯示單一 no-results empty state；某一區無結果時省略該區，不顯示空 section 佔位。
- [x] 成功提交搜尋後將 query 寫入 localStorage 搜尋紀錄；去重、最新在前、最多保留 12 筆，並提供清除紀錄操作。
- [x] 上述狀態在 phone／tablet／desktop 都能載入，且可見 UI／navigation／routing 變更交還前需實際打開頁面確認。
- [x] 驗收條件須對映到測試：view model／搜尋 helper 用 Vitest，主要 routing 與互動用 Playwright E2E。

## 相關檔案

- `app/utils/published-products.ts` — compact view model、category chips、product detail、推薦資料與 mixed search result 分區。
- `app/pages/index.vue` — 首頁 category pills 顯示與互動。
- `app/components/app-navigation.vue` — desktop sidebar category 入口需與首頁共用 category count/filter 來源。
- `app/pages/products/[id].vue` — 商品詳情取得目前商品與推薦候選資料。
- `app/components/product-detail.vue` — 詳情 1:1 hero image 與「You may also like」區塊。
- `app/components/product-card.vue` — 推薦區可沿用的商品卡片；搜尋結果改用共用橫版 row。
- `app/pages/guide.vue` — 改用共用 list / row UI。
- `app/pages/links.vue` — 改用共用 list / row UI。
- `app/components/link-panel.vue` 或新 `app/components/resource-list.vue` — 商品、指南、連結與搜尋 row 的共用 presentation component。
- `app/pages/search.vue` — 搜尋狀態機、autocomplete、history、mixed result 三區 layout。
- `app/utils/search/client-search.ts` — autocomplete 與完整搜尋結果 helper；必要時拆出 product／guide／link 分組 helper。
- `app/utils/search/search-index.ts` — 確認 result type 與 label 欄位足以支援 autocomplete 與 mixed sections。
- `app/utils/product-schema.ts` — Link schema 新增 optional `image_url` 驗證與測試。
- `app/assets/styles/catalog.css` — 1:1 detail image、推薦區、共用 list、搜尋初始／autocomplete／results layout。
- `tests/published-products.test.ts` — category chip、sidebar category source、推薦演算法、mixed search view model 測試。
- `tests/client-search.test.ts` — autocomplete limit、完整搜尋結果與 type 分組相關測試。
- `tests/e2e/compact-app.spec.ts` — 搜尋互動、詳情推薦、Guide／Links 一致 row、0 count category 不顯示。

## 介面／資料結構（API / Data Structure）

通訊協定：N/A。本 sprint 是 Nuxt SSG client UI 與 local view model 變更，不新增 REST／SSE／WebSocket API。

### Product Detail View

`ProductDetailView` 預期新增推薦商品欄位，使用既有 `PublishedProductCard` 以直接復用 `ProductCard`：

```ts
type ProductDetailView = {
  id: string
  title: string
  hero_image: string
  hero_alt: string
  channel_label: string
  channel_id: Product['channel_id']
  category_label: string
  price_label: string
  dw_says: string
  description: string | null
  tags: string[]
  buy_cta: {
    label: string
    href: string
    target: '_blank'
    rel: 'noopener noreferrer'
  }
  fine_print: string
  related_products: PublishedProductCard[]
}
```

若實作上保留 `getProductDetail(product, taxonomies)` 不接全量商品，可新增獨立 helper，例如：

```ts
function getRelatedProductCards(
  current_product: Product,
  products: Product[],
  taxonomies: TaxonomyDefinitions,
): PublishedProductCard[]
```

### Resource Row View

指南與連結共用 row contract，允許不同 type 顯示不同 icon 與 metadata：

```ts
type CompactResourceRow = {
  id: string
  type: 'product' | 'guide' | 'link'
  title: string
  subtitle: string
  meta: string | null
  href: string
  image_url: string | null
  icon: string | null
  external: boolean
  target: '_blank' | null
  rel: 'noopener noreferrer' | null
}
```

連結內容新增 optional image 欄位：

```ts
type LinkDefinition = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  title: string
  summary: string
  url: string
  image_url?: string | null
  icon: string
  category_ids: string[]
  tag_ids: string[]
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
}
```

指南 row 的 `external` 不能假設永遠為 `true`：若未來 guide content 指向站內路由，row component 需使用 `NuxtLink`；外部來源才使用 `<a target="_blank" rel="noopener noreferrer">`。

### Search UI State

搜尋頁需要區分「輸入字串」與「已提交 query」：

```ts
type SearchPageState = {
  pending_query: string
  submitted_query: string
  mode: 'idle' | 'suggesting' | 'searching'
  history_items: string[]
}
```

URL contract 維持 `/search?q=<query>`。只有 Enter、點擊 autocomplete、點擊搜尋紀錄或點擊熱門 tag 才更新 `q`。`q` trim 後為空時等同沒有 `q`，維持 `idle`，不觸發搜尋、不寫入 history、不顯示 no-results。

Autocomplete 使用簡潔 list view，不使用完整搜尋結果 row。每筆至少顯示 type label 與 title，可選擇顯示一行 summary；不顯示大型 thumbnail，避免手機輸入期間版面過重。最多顯示 12 筆，不設定各類型配額，依 search score 排序。

熱門 tag 使用 published products／guides／links 的 `tag_ids` 統計。排序為 count desc、label asc，最多顯示 10 筆；點擊熱門 tag 以 tag label 提交搜尋並更新 `/search?q=`。

搜尋 index 載入失敗時，不執行 fallback 搜尋；搜尋頁顯示可恢復的錯誤訊息，提醒使用者重新嘗試或清空搜尋。此狀態不可讓頁面 crash，也不可引入 runtime 外部資料 fetch。

### Search History

localStorage key：`dwselect.search.history.v1`。

```json
["機械鍵盤", "Sharp", "咖啡"]
```

規則：trim 後空字串不寫入；大小寫或全半形不強制合併，僅以完全相同字串去重；最新在前；最多 12 筆；localStorage 不可用時降級成空紀錄且不阻斷搜尋。

### Mixed Search Sections

搜尋模式主結果分三區：

```ts
type SearchResultSections = {
  products: CompactResourceRow[]
  guides: CompactResourceRow[]
  links: CompactResourceRow[]
}
```

三區都使用共用 resource row component。商品 row 以 `image_url` 顯示商品圖；指南與連結若有 `image_url` 也顯示圖片，否則使用 `icon` fallback。

三區顯示順序固定為：商品、指南、連結。每區 heading 顯示 count，例如 `商品 12`；count 為 0 的區塊不 render。

## 邊界案例

- **所有一般分類都是 0 筆**：首頁仍顯示「全部」chip；若沒有任何 published 商品，顯示既有空狀態。
- **URL 指向 0 筆分類**：若 `?category=<valid-empty-category>` 存在但該分類 pill 被隱藏，首頁顯示 no-results，使用者仍可點「全部」返回；不新增隱藏分類 pill。
- **推薦候選不足 3 筆**：盡量顯示可用候選；沒有候選時不顯示推薦區塊，不補假資料。
- **推薦分數相同**：用 `published_at` desc 與名稱穩定排序，避免 hydration 或 runtime 差異造成順序跳動。
- **localStorage 不可用**：搜尋頁仍可輸入、autocomplete、提交搜尋；搜尋紀錄區顯示空狀態，不丟錯。
- **localStorage JSON 損壞**：`dwselect.search.history.v1` 若不是合法 JSON 或不是字串陣列，解析失敗時降級成空紀錄，不讓頁面 crash。
- **純空白搜尋**：使用者輸入空白並按 Enter 時，trim 後等同空 query；不更新 URL、不寫入 history、不觸發搜尋。
- **快速連續輸入 autocomplete**：舊 request 回來時不可覆蓋較新 query 的 suggestions。
- **搜尋 index 載入失敗**：顯示可恢復的錯誤訊息，不執行 fallback 搜尋，不新增 runtime 外部資料 fetch。
- **`/search?q=` 直接開啟**：trim 後為空時等同 `/search` idle；有非空 query 時進入搜尋模式，input 顯示 query，並載入三區結果。
- **某一搜尋區沒有結果**：省略該區，避免顯示空 heading；三區都沒有結果時顯示 no-results。
- **指南可能是內部或外部連結**：共用 row 依 `external` 切換 `NuxtLink` 或 `<a>`；外部連結必須保留 safe attributes。
- **連結沒有圖片**：使用既有 icon fallback；新增 optional `image_url` 不可讓現有 link content 失效。
- **圖片載入失敗**：1:1 contain 圖片若載入失敗，row／detail／推薦區需保留版面穩定並顯示 icon 或背景 fallback，不顯示破版的大型 broken image。

## ADR

### ADR-1：搜尋採「輸入／提交」分離，而非 typing 即改 URL

- **決策**：`pending_query` 只控制 input 與 autocomplete；Enter 或點擊建議／紀錄才寫入 `/search?q=` 並進入搜尋模式。
- **原因**：使用者明確要求「搜尋框有字時顯示 autocomplete」與「Enter 或點擊才進入搜尋模式」；現行 debounce replace URL 會讓 typing 直接搜尋，和需求衝突。
- **替代方案**：保留現行 debounce 即時搜尋。排除原因：無法呈現 idle history、suggesting autocomplete、searching result 三種明確模式。

### ADR-2：搜尋主結果採混合三區與一致橫版 row，而非商品卡片 grid

- **決策**：搜尋模式上下分成商品、指南、連結三區；三區都用一致的橫版 row/list，左側媒體欄優先顯示圖片，沒有圖片時 fallback icon。
- **原因**：使用者確認搜尋產品也改用橫版排版，圖片放在原本 icon 位置，且產品與連結 row 要對齊並可顯示圖片；三區一致 row 能減少搜尋頁 layout 分裂。
- **替代方案**：商品區延用首頁 `ProductCard` grid、指南／連結使用 row。排除原因：搜尋頁內商品與其他內容的視覺密度和對齊方式會不一致。

### ADR-3：只為 Link schema 新增 optional `image_url`

- **決策**：Link content 新增 optional `image_url?: string | null`；沒有圖片的既有連結維持 icon fallback。
- **原因**：使用者確認產品與連結 row 都要可顯示圖片；商品與指南已有圖片欄位，只有 Link 缺少圖片欄位。optional 欄位是最小 schema 變更，不需要 migration。
- **替代方案**：不改 schema，只讓連結顯示 icon。排除原因：無法滿足連結 row 與商品 row 對齊顯示圖片的需求。

### ADR-4：商品推薦採 deterministic scoring

- **決策**：推薦排序以同分類、shared tags、同通路、發布時間、名稱作 deterministic scoring，排除目前商品，不導入隨機。
- **原因**：使用者尚未指定演算法；deterministic scoring 可測、可預期，且符合目前內容欄位與 SSG 限制。
- **替代方案**：隨機推薦或只取最新商品。排除原因：隨機不利測試與 hydration；只取最新無法體現相似性。

## Milestones

### Milestone 1：首頁分類與商品詳情基本修正
> 範圍：`published-products.ts`、`index.vue`、`app-navigation.vue`、`products/[id].vue`、`product-detail.vue`、`catalog.css`、`tests/published-products.test.ts`、`tests/e2e/compact-app.spec.ts`
> 驗證：新增／更新 Vitest 覆蓋 0 count category hidden、首頁與 sidebar 共用 category count/filter 來源、detail 1:1 contain image contract、推薦排序；E2E 驗證首頁與 desktop sidebar 都無 0 count category、詳情頁 image 與小型／精簡推薦卡片可見。
> 預期結果：首頁不再露出無效分類，商品詳情圖不裁切，詳情頁可用較低視覺權重的推薦商品繼續探索。

- [x] Red → Green → Refactor

### Milestone 2：Guide／Links 共用列表 UI
> 範圍：`product-schema.ts`、`guide.vue`、`links.vue`、`link-panel.vue` 或新 `resource-list.vue`、`published-products.ts`、`catalog.css`、`tests/product-schema.test.ts`、`tests/published-products.test.ts`、`tests/e2e/compact-app.spec.ts`
> 驗證：Vitest 覆蓋 Link optional `image_url` schema、guide/link row mapping、internal/external row attributes 與 safe external attributes；E2E 驗證兩頁 row class、gap、image/icon 欄位與 link attributes 一致。
> 預期結果：指南與連結頁使用同一套 row/list layout，連結可選擇顯示圖片，沒有圖片時維持 icon fallback。

- [x] Red → Green → Refactor

### Milestone 3：搜尋狀態機、autocomplete 與搜尋紀錄
> 範圍：`search.vue`、`published-products.ts`、`client-search.ts`、`search-index.ts`（若需補欄位）、`catalog.css`、`tests/client-search.test.ts`、`tests/published-products.test.ts`、`tests/e2e/compact-app.spec.ts`
> 驗證：Vitest 覆蓋 suggestion request race、autocomplete 12 筆上限、history serialize／dedupe／limit、localStorage JSON 損壞 fallback、熱門 tag 來源與排序、空白 query idle、index failure error state；E2E 驗證 typing 不改 URL、Enter／點擊才進 `/search?q=`、history／熱門 tag 與 simple list autocomplete 切換。
> 預期結果：搜尋頁初始顯示搜尋框與紀錄，輸入顯示 autocomplete，提交後才進搜尋模式。

- [x] Red → Green → Refactor

### Milestone 4：混合搜尋結果三區與整體驗證
> 範圍：`search.vue`、共用 resource list、`published-products.ts`、`catalog.css`、E2E 與全專案驗證。
> 驗證：E2E 驗證 `/search?q=<query>` 直接進搜尋模式且商品／指南／連結上下分區，三區 row 對齊、heading 顯示 count、空區跳過、所有圖片使用 1:1 contain；執行 `pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`；可見 UI 需實際打開首頁、商品詳情、指南、連結、搜尋頁確認可載入。
> 預期結果：8.6 全部 UX 修正完成，SSG 與 runtime clean gate 維持綠燈。

- [x] Red → Green → Refactor

## 版本與 Branch

- 編號 `008.6`：延續 008 content/domain/navigation 線與 008.5 quality gate 後的 UX bugfix sprint。
- 文件包：`docs/008.6-compact-ux-bugfixes/`。
- Branch：`feat/008.6-compact-ux-bugfixes`，從 `feat/008.5-lint-format-quality-gate` 建立。
