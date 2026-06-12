# 分類與標籤整理（taxonomy 重整與資料驅動化）

## 前置條件

- Sprint 010 的工作樹變更（M3～M5 產出）需先完成驗收與 commit，本 sprint 才建立 `feat/011-category-tag-taxonomy` branch 動工。本 spec 引用的程式現況以 010 工作樹為準。
- 規劃脈絡見同資料夾 `plan.md`（已確認決策六點）；brand taxonomy 與 product 欄位重整的後續決策記錄於 `works.md`。

## 目標

1. 主分類由「居家、廚房、電腦、3C、影音、食材、其他」重整為七個新分類：電腦3C、網路通訊、影音劇院、小家電、大家電、生活百貨、其他。
2. Tag 類 taxonomy 拆成兩個平行來源：一般 tags 表達 category 內 subcategory 與跨 category 共用語意（顯示器、電源充電、清潔、衛浴、廚房、照明等）；brand tags 獨立放在 `content/taxonomies/brands.json`，避免品牌混進一般 tags 維護。
3. Taxonomy 資料驅動化（低耦合）：增減 category / tag / brand 只需修改 `content/taxonomies/*.json` 與商品 JSON，不需修改 `app/`、`tests/`、`scripts/` 下任何檔案。
4. Product authoring 欄位重整：新增英文名稱作為優雅檔名與 URL 的來源，新增商品搜尋輔助欄位、型號欄位、多通路 offer 列表，並把 user-written description 與 LLM-maintained description 分開。
5. 既有 62 筆 published 商品、2 筆 guides、3 筆 links 完成遷移到新 taxonomy 與新 product schema。

## 非目標

- 不新增 brand 專用欄位：商品維持單一 `category_id` ＋ 多值 `tag_ids`（見 ADR-1）；brand tags 使用同一個 `tag_ids` 欄位引用，不新增 `brand_id` 或 `brand_ids` 欄位。
- 不重新設計 guides / links 的 taxonomy 語意（僅同步更新既有 5 筆的引用，使 build 維持綠燈）。
- 不動 channels taxonomy 的內容（pchome、momo 等通路定義不變）；`CHANNEL_IDS` enum 隨 ADR-2 移除後，channels 採最小化處理——只做 kebab-case 格式檢查，不強制 referential 檢查（使用者確認）。
- 不新增 brand 瀏覽頁或新 UI；tag-explorer、搜尋、導覽沿用既有元件與互動。
- 不處理 010 未完成項目（M3～M6 的驗收歸 010）。
- 不做舊商品 URL 相容：product id rename 後，舊 `/products/<old-id>` URL 直接 404，明確接受此 breaking change（見 ADR-8）；不產生 redirect stub。

## User Story

作為站長，我想要用貼近賣場習慣的主分類與 subcategory 式 tag 整理商品，以便快速找到並維護推薦品項。

作為訪客，我想要從導覽分類進入後再用 tag 縮小範圍，以便在不熟悉站內結構的情況下找到目標商品。

作為內容維護者，我想要新增分類、tag 或 brand 時只改 content JSON，以便不動程式碼就能擴充 taxonomy。

### 驗收條件

資料驅動化（解耦）：

- [x] `app/utils/product-schema.ts` 移除 `CATEGORY_IDS` 與 `CHANNEL_IDS` hardcoded enum；`category_id`、`offers[*].channel_id` 改為 kebab-case ASCII string schema（同 `tag_id_schema` 模式），category / tag 引用完整性統一由 `validateContentTaxonomyReferences()` 對 `content/taxonomies/` 把關；channel 僅格式檢查即可，不強制 referential。
- [x] `app/utils/published-products/shared.ts` 的 `DEFAULT_TAXONOMIES` 與 `compact-app.ts` 的 `DEFAULT_LINKS` 複本移除；`taxonomies` / `links` 參數改為必填，呼叫端（頁面與測試）明確傳入。
- [x] `compact-app.ts` 的 `PRODUCT_CATEGORY_IDS` hardcode Set 移除；route 解析（`parseCategoryId`）只依呼叫端傳入的 `category_ids` 判斷有效性。
- [x] brands 進入 runtime 讀取鏈：`content.config.ts` 新增 brands collection、`app/composables/use-catalog-data.ts` query brands 並納入 `runtime_taxonomies`、`app/utils/published-products/types.ts` 的 `TaxonomyDefinitions` 增加 `brands` 欄位、`scripts/build-search-index.ts` 讀取 brands；product card / detail / tag-explorer 的 label resolution 與 search index 才能取得 tags + brands 聯集。
- [x] `tests/taxonomy-sync.test.ts` 移除（複本不存在即無同步需求）；`tests/product-schema.test.ts` 中 hardcoded taxonomy id / label snapshot 改寫為資料驅動的 shape、唯一 id、排序規則驗證。
- [x] 真實 content 的 referential 完整性驗證位於 `tests/product-schema.test.ts` 的「should validate all migrated content domains against schemas and taxonomy references」測試（呼叫 `validateContentTaxonomyReferences()`），必須保留並擴充 brands 規則：products 的 `tag_ids` 可引用 tags 或 brands，guides / links 的 `tag_ids` 只能引用 tags。`tests/content-taxonomy-references.test.ts` 的職責是 post-migration 內容鎖定（筆數與舊 id 排除），於 M2 同步更新斷言。
- [x] 解耦演練通過：在測試中以 fixture 模擬「categories.json 新增一個分類」與「brands.json 新增一個品牌」，不改任何 app 程式碼，schema 驗證、route 解析、導覽資料（`getVisibleCategories`）、product tag label resolution 都正確接受新 taxonomy。

Taxonomy 內容與遷移：

- [x] `content/taxonomies/categories.json` 更新為七個新分類（id、label、nav_visible、sort_order 見介面段）。
- [x] `content/taxonomies/tags.json` 更新為新一般 tag 集合（含 label、description、aliases），並保留既有 `ergonomic`、`rice`。
- [x] 新增 `content/taxonomies/brands.json`，schema 與 tags 相同（`id`、`label`、`description`、`aliases`、`nav_visible`、`sort_order`），內容從 62 筆商品的品牌語意抽出；brand id 使用 kebab-case ASCII，label 使用正式品牌名。
- [x] 新增一次性遷移 script `scripts/legacy/migrate-category-tag-taxonomy.ts`（pattern 沿用 `scripts/legacy/migrate-content-domain-taxonomy.ts`）：依 script 內的 mapping 表改寫商品 `category_id` 與 `tag_ids`，輸出遷移 summary；可重複執行——skip 判定使用新 schema 特徵（已有 `offers` 欄位者視為已遷移），不以 category id 判定（`other` 新舊沿用，category-based 判定無法區分「已遷移」與「本來就是 other」）。
- [x] 62 筆 published 商品全數遷移：每筆 `category_id` 為新分類 id；`tag_ids` 引用皆存在於 tags 或 brands；無任何商品殘留舊 category id（home、kitchen、computer、three-c、av、food）。
- [x] 5 筆 guides / links 的 `category_ids` / `tag_ids` 同步更新為新 id（語意不變：Aeron guide 與 Altwork link 保留 `ergonomic`，日本米入門篇保留 `rice`）；guides / links 不引用 brands。
- [x] `pnpm build:search-index` 重建後，`public/search-index.json` 的 `category_labels` / `tag_labels` 反映新 taxonomy；`app/utils/search/search-index.ts` 會把 tags 與 brands 的 `aliases` 當作搜尋同義詞納入 index，以舊分類詞、品牌名或常用同義詞（如「廚房」、「充電器」、「HDMI」、「網通」）搜尋仍可透過 tag / brand label / aliases 命中商品。

Product 欄位重整：

- [x] Products 新增 `english_name: string`；authoring 時必填，作為產生 ASCII product id、JSON 檔名 stem 與 `/products/:id` URL 的來源。`id` 仍必須等於 JSON 檔名 stem，格式為 `<YYYY-MM-DD>-<english-name-slug>`，slug 使用 kebab-case ASCII。
- [x] Products 新增 `search_aliases: string[]` 與 `model_numbers: string[]`；兩者都納入 search index searchable fields，不需要在前台顯示。
- [x] Products 以 `offers[]` 取代頂層 `channel_id`、`purchase_url`、`price`、`price_text`；每筆 offer 把 `channel_id`、`url`、`price`、`price_text`、`checked_at` 放在同一列，避免多通路價格與日期錯位。
- [x] Product card / detail 的既有價格、通路、購買 CTA 顯示使用 `offers[0]` 作為 primary offer；多 offer 不新增 UI，保留資料可搜尋與後續擴充。
- [x] Products 描述欄位拆為三欄：`summary`（使用者撰寫短摘要）、`long_description`（使用者撰寫長描述）、`llm_description`（LLM 維護的補充描述，可包含規格與結構化筆記）；移除舊 `description` 欄位。
- [x] 一次性遷移時，為 62 筆 products 補 `english_name`，並以 `english_name` 產生新 `id` / JSON 檔名；同步更新 guides 的 `related_product_ids`、本地 `image_url` 與 `content/products/images/` 圖檔名，避免舊 id 殘留。
- [x] 一次性遷移時，既有 `description` 搬到 `long_description`；`search_aliases`、`model_numbers`、`llm_description` 初始可為空值，後續由人工與 LLM 補齊；既有 `channel_id` / `purchase_url` / `price` / `price_text` 搬成單筆 `offers[0]`，`checked_at` 使用既有 `updated_at`。
- [x] `tests/product-schema.test.ts`、`tests/published-products/*.test.ts`、`tests/search-index.test.ts` 覆蓋新欄位 schema、product id / filename slug 規則、primary offer mapping、english name / search aliases / model numbers / llm description 搜尋命中。

回歸與交付：

- [x] 既有行為鎖定：URL `/?category=<不存在的id>`（含舊 id 如 `kitchen`）fallback 為全部商品，有測試覆蓋。
- [x] 全部 quality gates 通過：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm generate`。
- [x] Frontend handoff：以 agent-browser 實際確認首頁分類導覽切換、tag-explorer 篩選、商品詳情 tag 連結、搜尋結果四個流程在新 taxonomy 下正常。

## 相關檔案

- `app/utils/product-schema.ts` — 移除 `CATEGORY_IDS` enum，`category_id` 改 string schema；referential 驗證已存在（`validateContentTaxonomyReferences`）
- `content.config.ts` — 新增 brands collection
- `app/composables/use-catalog-data.ts` — query brands，`runtime_taxonomies` 納入 brands
- `app/utils/published-products/types.ts` — `TaxonomyDefinitions` 增加 `brands` 欄位
- `app/utils/published-products/shared.ts` — 移除 `DEFAULT_TAXONOMIES`；label 查找函式保留；product card mapping 改讀 primary offer 與 `long_description`
- `app/utils/published-products/compact-app.ts` — 移除 `DEFAULT_LINKS`、`PRODUCT_CATEGORY_IDS`；`taxonomies` / `links` 參數改必填
- `app/utils/published-products/resource-rows.ts`、`product-detail.ts` — `taxonomies` 參數改必填；product detail 改讀 primary offer、`long_description`、`llm_description`
- `app/pages/index.vue`、`app/components/app-navigation.vue` — 已從 runtime taxonomies 取資料，確認傳遞鏈完整（預期小改或不改）
- `content/taxonomies/categories.json`、`tags.json`、`brands.json` — 新 taxonomy 內容
- `content/products/*.json`（62 筆）、`content/products/images/`、`content/guides/*.json`（2 筆）、`content/links/*.json`（3 筆） — 遷移目標；products 同步遷移 english name、id / 檔名、local image path、search aliases、model numbers、offers 與 description 欄位
- `scripts/legacy/migrate-category-tag-taxonomy.ts` — 一次性遷移 script，M3 完成後歸檔
- `app/utils/search/search-index.ts`、`scripts/build-search-index.ts`、`public/search-index.json` — 遷移後重建，且 search index 納入 product english name、tags / brands aliases、product search aliases、model numbers、LLM description 作為非顯示用搜尋欄位；`SearchDocument` 的 `price_text` / `channel_id` 改讀 `offers[0]`；`build-search-index.ts` 讀取 brands taxonomy
- `tests/taxonomy-sync.test.ts` — 移除；`tests/product-schema.test.ts`、`tests/content-taxonomy-references.test.ts`、`tests/published-products/*.test.ts`、`tests/search-index.test.ts` — 更新 fixture 與斷言
- `tests/e2e/compact-app.spec.ts` — 更新 hardcode 的分類 id / label 斷言（`/?category=av`、「影音」、「其他」隱藏斷言），歸入 M2 與遷移同步完成

## 介面 / 資料結構

### categories.json（完整定義）

| id | label | nav_visible | sort_order |
| --- | --- | --- | --- |
| `computer-3c` | 電腦3C | true | 10 |
| `network` | 網路通訊 | true | 20 |
| `av-theater` | 影音劇院 | true | 30 |
| `small-appliance` | 小家電 | true | 40 |
| `major-appliance` | 大家電 | true | 50 |
| `household` | 生活百貨 | true | 60 |
| `other` | 其他 | true | 999 |

JSON 結構沿用現行格式（`items[]`，欄位 `id`、`label`、`short_label`、`nav_visible`、`sort_order`），`short_label` 同 `label`。

### tags.json（完整定義）

| id | label | 主要用於 | aliases（搜尋同義詞） |
| --- | --- | --- | --- |
| `display` | 顯示器 | 電腦3C、影音劇院 | 電視、螢幕、顯示器 |
| `power-charging` | 電源充電 | 電腦3C、網路通訊、小家電 | 充電、行動電源、充電器、電池、UPS |
| `cable-adapter` | 線材轉接 | 電腦3C、影音劇院、網路通訊 | 線材、轉接、HDMI |
| `storage-backup` | 儲存備份 | 電腦3C | 儲存、NAS、隨身碟 |
| `desk-setup` | 桌面周邊 | 電腦3C | 鍵盤、滑鼠、周邊 |
| `network-gear` | 網路設備 | 網路通訊 | 路由器、交換器、網通 |
| `phone` | 手機 | 網路通訊 | 手機 |
| `tablet` | 平板 | 網路通訊 | 平板 |
| `comm-accessory` | 通訊配件 | 網路通訊 | 配件 |
| `av-source` | 訊源 | 影音劇院 | 串流、播放器 |
| `amplifier` | 擴大機 | 影音劇院 | 擴大機 |
| `speaker` | 喇叭 | 影音劇院 | 喇叭、音響、Soundbar |
| `headphone` | 耳機 | 影音劇院 | 耳機 |
| `kitchen` | 廚房 | 小家電、大家電、生活百貨 | 廚房、廚電 |
| `cleaning` | 清潔 | 小家電、生活百貨 | 清潔、掃除 |
| `air-care` | 空氣調節 | 小家電 | 空氣清淨、除濕、電暖 |
| `bathroom` | 衛浴 | 小家電、生活百貨 | 衛浴、浴室 |
| `countertop` | 桌上型 | 小家電 | 桌上型 |
| `lighting` | 照明 | 小家電、生活百貨 | 燈、吸頂燈、照明 |
| `refrigeration` | 冷藏冷凍 | 大家電 | 冰箱、冷凍櫃 |
| `laundry` | 洗衣烘衣 | 大家電 | 洗衣機、烘衣機 |
| `aircon` | 空調 | 大家電 | 冷氣、空調 |
| `fixed-install` | 固定安裝 | 大家電、生活百貨 | 安裝 |
| `food` | 食材 | 生活百貨 | 食材、食品 |
| `daily-goods` | 日用品 | 生活百貨 | 日用品、消耗品 |
| `organizing` | 收納整理 | 生活百貨 | 收納、整理箱 |
| `hardware-tools` | 五金工具 | 生活百貨 | 五金、工具 |
| `furniture-decor` | 家具家飾 | 生活百貨 | 家具、家飾 |
| `ergonomic` | 人體工學 | （保留既有） | 人體工學、電腦椅 |
| `rice` | 米食 | （保留既有） | 米 |

- 「主要用於」欄位只是編輯指引，不做程式層的 category–tag 綁定驗證（tag 本來就可跨 category 套用）。
- JSON 結構沿用現行格式（`id`、`label`、`description`、`aliases`、`nav_visible`、`sort_order`）；`aliases` 是搜尋同義詞（synonyms）的唯一資料欄位，不另增 `synonyms` 欄位；`nav_visible` 與 `sort_order` 維持現行語意。
- label / aliases 的最終文字實作時可微調，但 id 集合與上表一致。aliases 從簡即可——全文搜尋本來就會命中商品內文（使用者確認），aliases 只補 label 沒涵蓋的常用搜尋詞，並必須進入 search index 的 searchable fields；不需要出現在 `SearchIndexDocumentSummary` 或前台顯示資料中。

### brands.json（品牌 tag 定義）

`brands.json` 是與 `tags.json` 平行的 taxonomy 檔，表示品牌這類 tag-like 語意；商品仍使用既有 `tag_ids` 引用品牌 id，不新增 `brand_id` / `brand_ids` 欄位。

```json
{
  "items": [
    {
      "id": "panasonic",
      "label": "Panasonic",
      "description": "Panasonic 品牌商品",
      "aliases": ["國際牌"],
      "nav_visible": true,
      "sort_order": 100
    }
  ]
}
```

- Schema 沿用 tags 的 definition schema（`id`、`label`、`description`、`aliases`、`nav_visible`、`sort_order`），但檔案獨立為 `content/taxonomies/brands.json`。
- `products[*].tag_ids` 可引用 `tags.json` 或 `brands.json` 的 id；`guides[*].tag_ids` 與 `links[*].tag_ids` 只可引用 `tags.json`，避免 guide / link 被品牌 taxonomy 污染。
- Product card、product detail、tag explorer、search result 的 tag label resolution 對 products 使用 tags + brands 聯集；若 id 同時存在 tags 與 brands，測試應視為 taxonomy collision 並失敗。
- Search index 對 products 將 tags + brands 的 label / aliases 都納入 searchable fields；guides / links 只納入 tags 的 label / aliases。

### product JSON 欄位重整

Product 新 schema 保留 `summary` 作為短摘要，將原 `description` 改名為 `long_description`，新增 LLM 維護欄位與多通路 offers：

```json
{
  "id": "2026-06-02-benq-rd280u",
  "status": "published",
  "name": "BenQ RD280U",
  "english_name": "BenQ RD280U",
  "summary": "28\" 3840*2560 的螢幕，比一般 4K 多了一些高度。",
  "long_description": "使用者撰寫的長描述，保留 DW 的原始觀點與語氣。",
  "llm_description": "LLM 維護的補充描述，可包含規格、型號差異、適合情境與搜尋用補充文字。",
  "search_aliases": ["明基 RD280U", "程式設計螢幕"],
  "model_numbers": ["RD280U"],
  "offers": [
    {
      "channel_id": "pchome",
      "url": "https://24h.pchome.com.tw/prod/DSABSO-A900HJAH0",
      "price_text": "16888",
      "price": {
        "amount": 16888,
        "currency": "TWD",
        "unit": "each",
        "label": null
      },
      "checked_at": "2026-06-02T00:00:00+08:00"
    }
  ]
}
```

- `english_name`：authoring 必填英文名稱，作為 product id、JSON 檔名與 URL slug 的來源；前台顯示名稱仍使用 `name`。
- `id` / filename：必須等於 JSON 檔名 stem，格式為 `<YYYY-MM-DD>-<english-name-slug>`。日期前綴來源：遷移時沿用既有 id 的日期前綴；新商品 authoring 時使用建立當日日期。`english_name` slug 化規則為 lowercase、非英數轉 `-`、合併連續 `-`、去除首尾 `-`；collision 時在尾端加短 suffix（例如 `-2`）。
- `summary`：使用者撰寫短摘要，供卡片、搜尋摘要與列表使用；不由 LLM 自動覆寫。
- `long_description`：使用者撰寫長描述，供商品詳情主文使用；由舊 `description` 遷移而來。
- `llm_description`：LLM 維護的補充描述，可包含規格、型號差異、替代品比較、限制條件與搜尋補充詞；允許空字串，前台初期可不顯示。
- `search_aliases`：商品專屬搜尋同義詞、俗稱、錯字、外文名；不顯示，只進 search index。`english_name` 本身也必須進 search index，不需要重複放進 `search_aliases`。
- `model_numbers`：型號清單；不顯示或僅在後續 UI 需要時顯示，必須進 search index。
- `offers`：非空陣列；順序代表顯示優先序，`offers[0]` 是 primary offer。`channel_id` 只做 kebab-case 格式驗證，不做 referential；`url` 使用 HTTP(S) URL schema；`checked_at` 使用既有 timestamp schema。
- 舊頂層 `channel_id`、`purchase_url`、`price`、`price_text` 在新 schema 中移除，避免單一通路欄位與多通路 offers 並存造成來源歧義。

### 商品遷移 mapping 原則

逐筆 mapping 屬實作階段工作（plan.md 決策 6），script 內的 mapping 表依下列原則填寫，完成後隨 works.md 提交人工抽查：

| 原則 | 內容 |
| --- | --- |
| 衛浴設備歸屬 | 帶電／插電者（免治馬桶座、暖風機）→ `small-appliance`＋`bathroom`；不帶電者（浴櫃、水龍頭）→ `household`＋`bathroom`（＋`fixed-install` 視情況） |
| 照明 | 吸頂燈等家用燈具 → `small-appliance`＋`lighting` |
| 耳機與喇叭 | 統一 `av-theater`（含現屬 three-c 的 Bose QC45） |
| 廚房商品分流 | 大型（冰箱、冷凍櫃、洗碗機、大烤箱）→ `major-appliance`＋`kitchen`；小型廚電（電子鍋、微波爐、熱水瓶）→ `small-appliance`＋`kitchen`；非電器（濾水壺、磨刀器）→ `household`＋`kitchen` |
| 食材 | `food` category 廢止 → `household`＋`food` tag |
| 難分類 | 留 `other`、不打 tag |

### 遷移 script 介面

```
node scripts/legacy/migrate-category-tag-taxonomy.ts [--products-dir ...] [--guides-dir ...] [--links-dir ...] [--dry-run]
```

Summary 輸出（stdout JSON）：

```json
{
  "migrated": 62,
  "skipped": 0,
  "unmapped": [],
  "by_category": { "computer-3c": 13, "household": 18 },
  "by_brand": { "panasonic": 6, "other": 3 },
  "renamed_ids": [
    {
      "from": "2026-06-02-象印nw-jw10",
      "to": "2026-06-02-zojirushi-nw-jw10"
    }
  ]
}
```

- `unmapped`：mapping 表沒涵蓋的商品 id 清單；非空時 exit code 非 0，禁止寫檔（fail-fast，不默默留在舊分類）。
- `renamed_ids`：所有 product id / filename rename 的 old → new 對照；必須同步用於 `related_product_ids`、image path 與 search index 驗證。
- `--dry-run`：只輸出 summary 不寫檔。

### product-schema 變更

```typescript
// 移除：export const CATEGORY_IDS = [...] as const
// 移除：export const CHANNEL_IDS = [...] as const
const category_id_schema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a kebab-case ASCII category id')
const channel_id_schema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a kebab-case ASCII channel id')
```

`Product['category_id']` 型別由 union 放寬為 `string`；`ProductOffer['channel_id']` 取代舊 `Product['channel_id']`，同樣放寬為 `string`。category 有效性改由 `validateContentTaxonomyReferences()`（既有機制）與測試把關；channel 只做格式檢查。`Product['english_name']` 必須是非空字串，並由測試鎖定 id / filename stem 符合 slug 規則。`brands.json` 可共用 `tag_definition_schema` 或建立同結構的 `brand_definition_schema`；`ContentTaxonomyReferenceInput` 需能接收 brands，並以「product tag ids = tags ∪ brands；guide/link tag ids = tags」驗證引用完整性。

## 邊界案例

- **舊 URL query**：`/?category=kitchen`（已廢止的 id）→ 與不存在 id 同樣 fallback 為 `all`，不報錯。新增測試鎖定。
- **舊商品 URL**：`/products/<old-id>`（rename 前的 id）→ 404；明確接受此 breaking change（見非目標與 ADR-8），不做 redirect。
- **新增分類但無商品**：空分類不出現在導覽（維持現行 `count > 0` 過濾與既有 E2E 鎖定行為）；解耦演練只驗證資料層（schema 驗證、route 解析、`getVisibleCategories`）接受新分類，不要求導覽顯示。
- **「其他」分類在導覽**：遷移後若有商品落入 `other`，導覽依現行 `count > 0` 行為顯示「其他」，既有 e2e「其他不出現在導覽」斷言需依遷移結果同步更新；若無商品落入 `other` 則維持隱藏。
- **商品引用不存在的 category / tag / brand**：`validateContentTaxonomyReferences()` 回報 violation，對應測試失敗，擋在 build 前；products 的 `tag_ids` 可來自 tags 或 brands，guides / links 的 `tag_ids` 不可引用 brands。
- **tags 與 brands id collision**：同一 id 不可同時存在於 `tags.json` 與 `brands.json`；測試失敗並要求改名，避免 label resolution 與搜尋索引不可預期。
- **mapping 表遺漏商品**：遷移 script fail-fast（`unmapped` 非空即不寫檔），不允許部分遷移。
- **guides / links 的舊引用**：`category_ids` 同步換新 id（Aeron guide：`computer`→`computer-3c`；日本米入門篇：`food`→`household`；links 同理）；`ergonomic`、`rice` tag 保留故 `tag_ids` 不變。
- **搜尋舊分類詞與品牌同義詞**：「廚房」等詞不再是 category label，但仍是 tag label / aliases；品牌名與品牌 aliases 由 `brands.json` 提供，search index 重建後可命中。
- **商品沒有 offers**：schema validation 失敗；published product 必須至少有一筆 primary offer，避免購買 CTA 無來源。
- **同商品多通路 offer**：`offers[0]` 是 primary offer，用於現有 card / detail 顯示；其餘 offers 只進資料與搜尋，不新增 UI。
- **舊頂層購買欄位殘留**：`channel_id`、`purchase_url`、`price`、`price_text` 在 product schema 中移除，因 schema strict，殘留即測試失敗。
- **LLM description 尚未撰寫**：`llm_description` 可為空字串；搜尋索引需能處理空字串，不影響頁面渲染。
- **型號或搜尋 aliases 重複**：同一商品內 `model_numbers`、`search_aliases` 應去重；大小寫與全半形正規化不在本 sprint 強制處理。
- **英文名稱 slug collision**：兩個商品同日且 `english_name` slug 相同時，migration script 必須加穩定 suffix（如 `-2`），並在 summary 列出 collision 決策供人工檢查。
- **英文名稱缺失或無法 slug 化**：schema 或 migration fail-fast；不得退回中文檔名或 hash slug。
- **產品 id 改名後的引用**：guides `related_product_ids`、product image `image_url`、`public/search-index.json` 與 prerender product routes 必須同步更新，測試需確認沒有舊 id 殘留。

## ADR（Architecture Decision Record）

### ADR-1：維持單一 `category_id`

- **決策**：商品維持單一主分類欄位，多重語意一律用 `tag_ids` 表達；品牌也以 brand tag id 放進 `tag_ids`，但品牌 taxonomy 獨立在 `brands.json`。
- **原因**：導覽、route 解析、search index、卡片排序都建立在單一主分類上；跨分類需求（廚房、衛浴）由共用 tag 已可滿足；品牌是與一般 tag 平行的維護維度，分檔可降低 tags 雜訊，又不需要新增欄位與 UI contract。
- **替代方案**：`category_ids` 多值——牽動資料模型、routing 與所有 UI 篩選邏輯，收益不成比例。

### ADR-2：資料驅動驗證取代 hardcoded enum＋同步測試

- **決策**：移除 `CATEGORY_IDS` / `CHANNEL_IDS` enum 與 `DEFAULT_TAXONOMIES` / `DEFAULT_LINKS` 複本，schema 只驗格式（kebab-case），有效性由既有的 referential 驗證對 `content/taxonomies/` 把關；`taxonomy-sync.test.ts` 鎖定的四項複本全數消失，測試隨之移除。
- **原因**：010 M3 的「複本＋同步測試」只能保證不忘記同步，仍要求每次增減分類改 code；011 的目標是 content-only 擴充。Runtime（Nuxt Content）與 build（search index script）本來就讀 content，複本是唯一耦合殘留。
- **替代方案**：保留 enum 靠同步測試提醒——不符合「增減分類不改 code」的明確需求。代價是失去 compile-time 的 category 字面值型別，由測試層補償。

### ADR-3：新分類採用新 id，不沿用舊 id

- **決策**：七個新分類全部使用新 id（`other` 除外），不沿用 `computer`、`av` 等舊 id。
- **原因**：舊 id 的語意範圍已改變（如新「電腦3C」併入舊 3C 的充電器與行動電源），沿用會讓遷移狀態不可判別（看到 `computer` 不知道是遷移前還是遷移後）；新 id 讓「殘留舊 id」成為可測試的失敗條件。category 只出現在 query param，無永久連結成本，舊值已有 fallback 行為。
- **替代方案**：沿用舊 id 改 label——省遷移量，但語意混淆且無法用測試證明遷移完成。

### ADR-4：一次性遷移 script 而非手改 JSON

- **決策**：mapping 表寫在 `scripts/legacy/migrate-category-tag-taxonomy.ts` 內，script 執行遷移並輸出 summary，完成後保留於 `scripts/legacy/`。
- **原因**：62＋5 筆手改易錯且不可重現；script 的 mapping 表本身就是可 review 的遷移紀錄，fail-fast 機制保證無遺漏。沿用 `migrate-content-domain-taxonomy.ts` 的既有 pattern（型別定義、summary、寫檔格式、CLI）。
- **替代方案**：手動編輯——不可重現、無法驗證完整性。

### ADR-5：品牌以獨立 taxonomy 檔管理但不新增商品欄位

- **決策**：新增 `content/taxonomies/brands.json`，schema 與 tags 相同；products 仍以 `tag_ids` 引用 brand ids，guides / links 不引用 brands。
- **原因**：品牌的維護性質與 tag 平行，但不是 category 內 subcategory，也不是跨 category 功能語意；獨立檔案能讓品牌清單、aliases、排序與一般 tags 分開 review。維持 `tag_ids` 則避免新增欄位、改 UI contract 與大量 consumer 型別。
- **替代方案**：新增 `brand_id` / `brand_ids`——語意更純，但需要改 content schema、search index、product card/detail、filter UI 與 migration script，超出目前「分檔不改欄位」的決策。

### ADR-6：多通路購買資訊改為 `offers[]`

- **決策**：移除 product 頂層 `channel_id`、`purchase_url`、`price`、`price_text`，改以 `offers[]` 表達；每筆 offer 綁定 `channel_id`、`url`、`price`、`price_text`、`checked_at`。
- **原因**：商品未來可能同時有多個購買通路；URL、價格與日期必須在同一列，才不會出現「PChome URL 搭 momo 價格」這類資料錯位。`offers[0]` 保留現有單一 CTA 顯示行為，避免同時改 UI。
- **替代方案**：保留頂層欄位再新增 secondary offers——會產生兩個購買資料來源，後續 search index 與 UI 需要定義優先序，複雜度更高。

### ADR-7：描述拆成 user-written 與 LLM-maintained 欄位

- **決策**：Product 描述欄位使用 `summary`、`long_description`、`llm_description` 三欄；前兩欄原則上由使用者撰寫，`llm_description` 由 LLM 維護，可包含規格與補充筆記。
- **原因**：短摘要、長描述、LLM 補充的信任來源不同，混在同一欄會讓後續維護者不知道哪些文字是 DW 原始觀點、哪些是 LLM 補充。規格資料先以 prose 放進 `llm_description`，不急著建立 `specs` 結構化欄位。
- **替代方案**：新增 `specs` object 或多個結構化描述欄位——目前商品類型跨度太大，過早結構化容易變成低品質萬用欄位。

### ADR-8：以 `english_name` 產生 product id、檔名與 URL

- **決策**：Products 新增 `english_name`，並以 `english_name` slug 產生 `id`、JSON 檔名 stem 與 `/products/:id` URL；`id` 仍等於檔名 stem。
- **原因**：目前部分商品檔名與 URL 含中文或混合語言，不利於人工 authoring、review 與分享。英文名稱是穩定、可讀、可 review 的 slug 來源，也能進 search index 增加英文查詢命中。
- **URL breaking change**：rename 後舊 `/products/<old-id>` 直接 404，明確接受——本站商品 URL 多含中文、外部引用量有限，不值得維護 redirect 層；prerender routes 由檔名動態產生（`scripts/build-product-routes.ts`），rename 後自動同步，無 stale route 風險。
- **替代方案**：新增獨立 `slug` 欄位但保留舊 id——會讓 content filename、id、route slug 三者分裂，增加 Nuxt Content 查找與 prerender route 對應成本。以 `renamed_ids` 產生 redirect stub——可保舊連結，但為有限的外部引用增加 generate 複雜度，不採用。

## Milestones

### Milestone 1：taxonomy 資料驅動化（解耦）

> 範圍：`app/utils/product-schema.ts`（僅 enum 移除、category / channel 改 kebab-case 格式驗證；product 欄位重整的 schema 切換歸 M2）、`app/utils/published-products/{shared,compact-app,resource-rows,product-detail,tags}.ts`、`app/utils/published-products/types.ts`（`TaxonomyDefinitions` 加 brands）、`content.config.ts`（brands collection）＋空的 `content/taxonomies/brands.json`（`items: []`，內容歸 M2）、`app/composables/use-catalog-data.ts`、呼叫端頁面、`tests/taxonomy-sync.test.ts`（移除）、`tests/published-products/*.test.ts`、`tests/content-taxonomy-references.test.ts`、`tests/product-schema.test.ts`
> 驗證：`pnpm test`、`pnpm typecheck`、`pnpm lint`
> 預期結果：以 fixture 新增分類與品牌的解耦演練測試通過；複本與 enum 不存在；brands runtime 讀取鏈（collection → composable → `TaxonomyDefinitions` → label resolution）就緒；全測試綠（此時 content 仍是舊 taxonomy 與舊 product 欄位，行為不變）

- [x] Red → Green → Refactor

### Milestone 2：product schema 切換、新 taxonomy 定義與內容遷移

> 範圍：`app/utils/product-schema.ts`（欄位重整 schema 切換：必填 `english_name` / `offers`，移除舊頂層 `channel_id` / `purchase_url` / `price` / `price_text` 與 `description`，與 content 遷移原子完成）、`content/taxonomies/{categories,tags,brands}.json`、`scripts/legacy/migrate-category-tag-taxonomy.ts`（新增＋mapping 表，M3 歸檔）、`content/{products,guides,links}/*.json`、`app/utils/search/search-index.ts`（offers[0] 映射）、`scripts/build-search-index.ts`（讀 brands）、`public/search-index.json`、`tests/content-taxonomy-references.test.ts`、`tests/search-index.test.ts`、`tests/e2e/compact-app.spec.ts`（分類 id / label 斷言更新）、route fallback 測試
> 驗證：`pnpm test`、`pnpm test:e2e`、`node scripts/legacy/migrate-category-tag-taxonomy.ts --dry-run` 後執行、`pnpm build:search-index`
> 預期結果：62 商品＋5 guides/links 完成遷移、品牌 ids 進入 products `tag_ids`、products 全數改為 english_name / ASCII id + filename / offers / long_description / llm_description / search_aliases / model_numbers schema、summary 無 unmapped、referential 測試綠、e2e 斷言同步更新後綠、mapping 結果列入 works.md 供人工抽查；schema 切換與 content 遷移在同一 milestone 原子完成，commit 時全測試綠

- [x] Red → Green → Refactor

### Milestone 3：回歸驗證與 Frontend Handoff

> 範圍：全 quality gates、E2E、agent-browser 人工驗證
> 驗證：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm generate`
> 預期結果：全 gates 綠；agent-browser 實看首頁分類導覽、tag 篩選、商品詳情、搜尋四流程正常；遷移 script 移入 `scripts/legacy/`

- [x] Red → Green → Refactor
