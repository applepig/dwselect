# Product Reference Links Plan

## 背景

Product 目前只有單一 `reference_url: string | null`，可放產品官網、評測、原始文章或賣場參考之一；購買連結則放在 `offers[]`。這次新增行李箱時，主商品 PChome、虎航行李規定、Allez 比較款都屬於「參考來源」，但目前沒有固定欄位能以結構化方式保存多個 reference／extra links。

既有 `llm_description` 內可用 Markdown 保留多個來源，但它是敘述內容，不是 schema-level contract；前台 detail view 也尚未把 `reference_url` 映到 UI。

## 現況觀察

- `app/utils/product-schema.ts`：Product schema 有 `reference_url` 單一欄位，沒有 `reference_links` 或 `extra_links`。
- `content/products/*.json`：目前每筆 product 都有 `reference_url` 欄位，部分為 `null`。
- `scripts/public-payload/map-product-detail.ts`：detail payload 沒有輸出 `reference_url`。
- `app/components/product-detail.vue`：商品詳情頁沒有固定的參考來源／延伸連結區塊。
- `docs/020-product-detail-info-architecture/spec.md` 已記錄：`reference_url` 存在於 raw content，但沒有明確 runtime UI contract。

## 修正後方向

這不是要把 Product 參考來源變成站內 `content/links` 的完整 `Link` content，也不是要新增 `kind` enum。正確抽象是「產品相關外部目標」：共用核心是 `{ "url": string }`，不同用途再附加顯示或購買 metadata。

- `offers[]` 是購買外部目標的特化：除了 URL，還有 `channel_id`、`price_text`、`price`、`checked_at`；顯示文字由 channel label 解析。
- `reference_links[]` 是不帶價格的產品相關外部目標：可放官網、規格頁、評測、比較款、航空規定等，顯示時看 `title`。
- 不新增 link `kind`／`type` 分類，避免和站內 Link content 或 channel taxonomy 形成第三套語彙。
- `reference_links` 不必填；沒有參考來源的商品可省略或維持空陣列，實作時由 schema 決定是否 normalization。

## 方案

### 方案 A：新增 `reference_links[]`，保留 `reference_url`

- Schema 加 `reference_links?: Array<{ title, url }>`，既有 `reference_url` 繼續存在。
- 優點：遷移風險低，可以逐步填資料。
- 缺點：長期有兩個來源，content authoring 需要定義優先序，容易再次混亂。

### 方案 B：以 `reference_links[]` 取代 `reference_url`（推薦）

- Product schema 移除 `reference_url`，新增 optional `reference_links` array。
- 既有 `reference_url` 非空者遷移成一筆 link；`null` 遷移後省略 `reference_links`，public payload 再 normalize 成 `[]`。
- link shape 建議：`{ "title": string, "url": string }`，對齊產品外部目標抽象，不新增 `kind`。
- 優點：單一資料來源、結構清楚、可直接支援 Allez 比較款與虎航規定這種 extra links。
- 缺點：需要一次更新全部 product JSON、schema、payload、content authoring 文件與測試。

### 方案 C：只依賴 `llm_description` Markdown links

- 不改 schema，只規定 agent 把多個參考來源寫進 `llm_description`。
- 優點：零 schema 改動。
- 缺點：不是固定欄位，不能穩定顯示、搜尋、驗證或讓 UI 做一致的「參考資料」區塊。

## 推薦方向

採用方案 B。這是 content model 的語意修正，不應留下 `reference_url` 與 `reference_links` 兩套來源。因為所有 content 都在 Git 裡，資料量目前約 91 筆 product，可以在同一 milestone 內原子遷移。

## 初步範圍

- 更新 Product schema：新增 optional `reference_links: { title, url }[]`，移除 `reference_url`。
- 遷移所有 `content/products/*.json`。
- 更新 product detail payload type 與 mapper。
- 在商品詳情頁新增「參考資料」區塊，顯示 `reference_links`。
- 更新 content authoring 文件與 skill 指引。
- 更新 schema／payload／component 測試，並跑 `pnpm content:check` 與相關 Vitest。

## 已確認

- 使用者同意一次遷移並移除 `reference_url`。
