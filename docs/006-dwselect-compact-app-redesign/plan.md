# Sprint 6：DW嚴選 Compact App Redesign 規劃

## 背景

DW嚴選目前已完成 legacy data cutover：商品資料已從 Google Sheets TSV 遷移到 `content/products/*.json`，並透過 Nuxt Content `products` collection 作為公開站資料來源。公開首頁目前是單頁 catalog，已支援 published-only、分類、搜尋、排序、MiniSearch static index 與 static generate。

`docs/design_handoff_dwselect_redesign/README.md` 提供了 C 路線「俐落清單」的 high-fidelity handoff。這份 handoff 不是單純換皮，而是新的 compact app shell：首頁、指南、搜尋、連結四個 tab，搭配 phone bottom tab、tablet rail、desktop sidebar、light/dark theme、商品詳情 modal / sheet 與 View Transition。

## 已知現況

- 技術棧：Nuxt 4、Nuxt UI 4、Nuxt Content 3、Tailwind via Nuxt UI、Vitest、MiniSearch。
- 資料來源：`content/products/*.json`，目前 66 筆 published 商品。
- 現有 Product schema 欄位：`id`、`status`、`name`、`price_text`、`description`、`purchase_url`、`image_url`、`category`、`tags`、`reference_url`、timestamps。
- 現有 UI：`app/pages/index.vue` 單頁 catalog，包含 `UInputMenu` 搜尋、分類 chips、排序、商品卡、購買連結。
- 現有 CSS：`app/assets/styles/catalog.css` 是目前 public catalog 視覺，與 handoff 的 dark/warm compact app tokens 差異大。
- 真實分類分布：居家、廚房、電腦、3C、影音、食材。handoff sample 的「生活」不是目前真實分類；目前多出「電腦」與「食材」。
- 真實通路資訊目前藏在 `purchase_url` host 或 tags 中，例如 PChome、momo、Amazon JP、Facebook、Costco、IKEA、官網等；本 sprint 會把第一波支援通路寫入獨立 definition JSON。

## 目標方向

採用 A 路線：忠實落實 handoff 的 compact app redesign，同時保留目前 Nuxt Content 與 MiniSearch static 架構。

這次 redesign 應該先做 schema evolution 與資料 migration，再做 UI。原因是 `channel`、價格數字、價格 label 與短／長描述都是 domain data，不應在 UI 層反覆從 URL、字串或 description 推導。

## 非目標草案

- 不回到 Google Sheets runtime fetch。
- 不新增 REST、SSE、WebSocket API。
- 不新增 CMS 或 inside editing UI。
- 不做價格歷史、價格監控或價格區間篩選。
- 不要求一次補齊所有商品的長篇介紹；可先用 migration 從既有 `description` 產生安全 fallback。
- 不把 handoff sample data 當 production content 匯入。

## Product Schema 演進草案

建議將 Product schema 往 handoff data model 靠攏，但保留目前 content SSOT 的實際需求。

新增或調整欄位：

- `price: { amount: number | null, currency: string | null, unit: string | null, label: string | null }`：結構化價格資料。`currency` 使用 ISO 4217 三碼貨幣代碼，例如 `TWD`、`JPY`、`USD`；`amount` 是可安全解析的數字；`unit` 表示售價單位，例如 `each`、`kilogram`；`label` 表示「低於 60000」或其他不適合純數字化的顯示文案。
- `price_text: string`：保留原始顯示文字，用於 UI 顯示與 migration safety。
- `channel_id: string`：商品通路 id，對應獨立 channel definition JSON。第一波只建立 `pchome`、`momo`、`amazonjp`、`amazonus`、`costco`、`other`。
- `category_id: string`：商品分類 id，對應獨立 category definition JSON；商品不再保留舊 `category` 中文分類欄位，也不直接依賴中文分類顯示名稱作為資料關聯鍵。
- `summary: string`：卡片與列表使用的一句話短評。
- `description: string`：詳情頁使用的完整描述。初期 migration 可先等於既有 `description`，之後再逐筆補長文。

命名備註：handoff 使用 `review` 表示 DW 的一句話；目前專案已有 `description`。建議 schema 使用 `summary` 表示 one-line，`description` 表示 full body，避免 `review` 與既有欄位語意混淆。

## Migration 策略草案

建議寫一次性 migration script，對 66 筆 content JSON 做 schema expansion。

初始規則：

- `summary` 從既有 `description` 複製。
- `description` 暫時保留既有 `description`，等同 full body fallback。
- `channel_id` 由 `purchase_url` host 推導一次並寫回 JSON；之後 UI 不再 runtime 推導。第一波只辨識 PChome、momo、Amazon JP、Amazon US、Costco，其餘寫成 `other`。
- `category_id` 由既有 `category` 中文名稱透過 category definition JSON 對應；migration 完成後移除舊 `category` 欄位。若出現新分類，先新增 definition，再讓商品引用。
- `price_text` 保留原值。
- `price.amount` 只在可安全解析數字時填入；無法安全解析時填 `null`。
- `price.currency` 使用 ISO 4217 code，從價格文字與通路推導，例如 `￥` 或 Amazon JP 可初始標記 `JPY`，純數字且台灣通路可標記 `TWD`，Amazon US 可標記 `USD`，無法判斷則 `null`。
- `price.unit` 用於 `200/kg` 這類單位價格；初期至少支援 `each` 與 `kilogram`。
- `price.label` 用於模糊或覆蓋顯示，例如「低於 60000」；若為 `null`，UI 可用 `price_text` 或格式化後的結構化價格。
- 不新增 `hot` 欄位；「嚴選熱推」等精選狀態等未來有點擊、PV 或編輯需求時再設計。

需要測試覆蓋：

- 所有 `content/products/*.json` 通過新版 `product_schema`。
- migration 後商品數仍為 66，且 `id` 等於檔名 stem。
- channel inference 對主要 host 有固定 mapping，未列入第一波 definition 的 host 會落到 `other`。
- category migration 必須要求所有商品的 `category_id` 都存在於 category definition JSON，且 content JSON 不再保留舊 `category` 欄位。
- price parsing 不把 `￥`、`/kg` 或範圍文字錯誤當成單一 NT 數字，並能保留幣別、單位與 label 語意。
- MiniSearch document mapping 納入 `summary` 與 `description`，且 search index document count 不變。

## UI 落地策略草案

保留現有 `app/pages/index.vue` 作入口，但重構成 compact app shell。

建議拆出的 UI 單元：

- `ProductCard`：image tile、channel badge、price chip、name、summary。
- `ProductDetail`：hero、channel、title、price、DW 怎麼說、tags、buy button、fine print。
- `AppNavigation`：phone bottom tab、tablet rail、desktop sidebar。
- `ThemeToggle`：`useColorMode()` light/dark toggle。
- `TagExplorer`：指南 tab 的 AND tag filter。
- `LinkPanel`：用類似商品 grid 的卡片介紹相關連結；資料獨立維護，不寫死在 component 內。

狀態仍可先放在 page local state：

- `active_tab`
- `active_category`
- `selected_tags`
- `search_query`
- `open_product`
- `colorMode` via `useColorMode()`

## 方案比較

### 方案 A：Schema-first + Compact App Redesign（推薦）

先擴 Product schema 與 content JSON，再實作 handoff UI。

優點：資料語意乾淨，UI 不需要一直推導 channel、價格與短評；後續 inside editing 也能直接編輯正確欄位。

缺點：scope 最大，需要 migration、schema、search、UI、detail modal 分 milestone 做。

### 方案 B：UI-first，runtime 推導缺資料

先套 handoff UI，channel 與價格在 view-model runtime 推導。

優點：最快看到畫面。

缺點：會把 domain rule 藏在 UI helper，之後 schema migration 還要再改一次。

### 方案 C：只做現有 catalog 視覺更新

保留單頁 catalog，只套色彩與卡片。

優點：最小改動。

缺點：沒有達成 handoff 的 4-tab app、detail、theme 與 View Transition，價值不足。

## 推薦結論

採用方案 A。這次 sprint 應拆成至少三個 milestone：

1. Schema evolution、migration script、content JSON 更新與 search contract 測試。
2. Compact app shell、tabs、theme tokens、首頁／指南／搜尋／連結基本 UI。
3. Product detail modal / sheet、buy CTA、View Transition 與 responsive polish。

## 已確認決策

- 決策：價格欄位採多幣別／單位價格模型，而不是單一 `price_value`。
- 原因：目前真實商品包含 NT 純數字、日幣、每公斤價格與可能的模糊價格；若只存 NT 數字，後續仍會再次 schema evolution。
- 取捨：migration 與測試 scope 會比單一 `price_value` 大，但資料語意更穩定，適合作為 inside editing 與 redesign UI 的長期契約。
- 決策：`price.currency` 使用 ISO 4217 三碼貨幣代碼，並用 `Intl.NumberFormat` 做格式化。
- 原因：ECMA-402 / `Intl.NumberFormat` 的 currency option 使用 ISO 4217，這是 web 與商務系統的通用規格。
- 取捨：`Intl.NumberFormat` 不能直接表達「currency per unit」，所以售價單位必須另外存 `price.unit`，由 UI 組合顯示。
- 決策：channel 與 category 改由獨立 JSON definition 維護，Product 存 `channel_id` 與 `category_id`。
- 原因：通路與分類有顯示名稱、排序、顏色、icon、host mapping 等 metadata，不適合散落在 Product 或 component 內。
- 位置：definition JSON 放在 `content/taxonomies/`，例如 `channels.json`、`categories.json`、`links.json`。不用 `enum` 命名，因為這些檔案不是單純 enum，而是含顯示名稱、排序、顏色、icon 與 host mapping 的 taxonomy metadata。
- 決策：第一波 channel 僅支援 `pchome`、`momo`、`amazonjp`、`amazonus`、`costco`、`other`；其餘 migration 先歸到 `other`。
- 決策：本 sprint migration 直接移除 Product 的舊 `category` 欄位，改用 `category_id` 作唯一分類關聯。
- 決策：不在本 sprint 新增 `hot`；等未來有點擊、PV 或明確編輯需求再設計。
- 決策：連結 tab 會是一個站內 panel / page，用類似 grid 的方式介紹相關連結，資料獨立維護。
