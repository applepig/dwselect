# Product Reference Links

## 目標

將 Product 的單一 `reference_url` 改成可容納多筆「產品相關外部目標」的 `reference_links`，和既有 `offers[]` 共用 URL 目標抽象，表達官網、規格頁、評測、比較款、航空規定等非購買來源。

## 非目標

- 不把 Product 參考來源改成站內 `content/links` 的完整 Link content。
- 不新增 link `kind`／`type` enum，不建立第三套分類語彙。
- 不重做 `offers[]` 的 content 外觀；購買連結仍維持現有欄位與 UI。
- 不批次補齊所有商品的多筆參考來源；本 sprint 只做 schema 遷移與目前需要的內容修正。
- 不改 search ranking 或新增搜尋權重。

## User Story

作為內容維護者，我想要在商品資料中保存多個結構化參考連結，以便同一商品能同時記錄官網、規格頁、評測、比較款或相關規定，而不用塞進 `llm_description` Markdown 或被單一 `reference_url` 限制。

### 驗收條件

- [x] Product schema 接受 optional `reference_links`，每筆 link 至少包含 `title` 與 HTTP(S) `url`。
- [x] Product schema 不再接受 `reference_url`，避免單一與多筆參考來源並存。
- [x] 既有 `content/products/*.json` 全部完成遷移：原 `reference_url` 非空者變成一筆 `reference_links`，原 `null` 者省略 `reference_links`。
- [x] 新增的金安德森登機箱商品能在 `reference_links` 中保存主商品、虎航行李規定與 Allez 比較款。
- [x] Product detail payload 帶出 `reference_links`，商品詳情頁固定顯示「參考資料」區塊；沒有參考連結時不顯示空區塊。
- [x] `pnpm content:check` 通過。
- [x] 相關 unit/component 測試覆蓋 schema、payload mapping 與 detail UI 顯示／隱藏。

## 相關檔案

- `app/utils/product-schema.ts` — Product schema、共用外部連結 schema 與型別。
- `content/products/*.json` — 移除 `reference_url`，遷移為 `reference_links`。
- `scripts/public-payload/map-product-detail.ts` — 將 product `reference_links` 映到 detail view model。
- `app/utils/public-content-view-types.ts` — `ProductDetailView` 新增 `reference_links` 型別。
- `app/components/product-detail.vue` — 商品詳情頁顯示參考資料區塊。
- `content/AGENTS.md`、`.opencode/skills/dwselect-content-authoring/SKILL.md` — 更新 content authoring 規則。
- `tests/product-schema.test.ts`、`tests/public-payload/*`、`tests/published-products/*` — 更新 schema／payload／UI 測試。

## 介面／資料結構

這是 Git-backed JSON content schema 與 public payload 變更，不新增 REST API endpoint。既有 `/api/content.json` 與 `/api/products/:id.json` 仍由 Nuxt server route 產生。

### Product Content Schema

共用外部目標抽象：

```ts
type ProductExternalTarget = {
  url: string
}
```

參考連結在共用 URL 目標之外增加顯示標題：

```ts
type ProductReferenceLink = ProductExternalTarget & {
  title: string
}
```

Product 內使用：

```json
{
  "reference_links": [
    {
      "title": "PChome 24h 商品頁",
      "url": "https://24h.pchome.com.tw/prod/DIBMWM-A900HO8OQ"
    },
    {
      "title": "台灣虎航行李規定",
      "url": "https://www.tigerairtw.com/zh-TW/welcome-on-board/baggage"
    },
    {
      "title": "PChome 24h 比較款：ALLEZ 奧莉薇閣 AVT24021 21吋",
      "url": "https://24h.pchome.com.tw/prod/DIBKVL-A900IUDRK"
    }
  ]
}
```

`reference_links` 是 optional。沒有參考來源時省略；public payload mapper 將缺值 normalize 為空陣列，讓 UI 只需要檢查 `reference_links.length`。

### Relation To Offers

`offers[]` 保持現有資料外觀：

```ts
type ProductOffer = ProductExternalTarget & {
  channel_id: string
  price_text: string
  price: ProductPrice
  checked_at: string
}
```

Content JSON 不需要在 offer 內新增 `title`；購買連結顯示名稱仍由 `channel_id` 對應 `channels.json` label。上述型別只描述設計抽象：購買連結與參考連結都指向外部 URL，只是購買連結有 channel／price metadata，參考連結有手寫 `title`。

### Product Detail View

`ProductDetailView` 新增：

```ts
type ProductDetailReferenceLink = {
  title: string
  url: string
}

type ProductDetailView = {
  reference_links: ProductDetailReferenceLink[]
}
```

UI 顯示規則：

- `reference_links.length > 0` 時顯示「參考資料」區塊。
- 每筆連結以 `title` 作為可點文字，`target="_blank"`，`rel="noopener noreferrer"`。
- `reference_links.length === 0` 時不渲染區塊。

## 邊界案例

- Case 1：商品沒有任何參考連結。處理方式：content 可省略 `reference_links`，payload normalization 為 `[]`，UI 不顯示空區塊。
- Case 2：舊 `reference_url` 為 `null`。處理方式：遷移後不留下 `reference_url`，且不產生假連結。
- Case 3：舊 `reference_url` 是賣場頁。處理方式：仍可成為 `reference_links` 的一筆，`title` 使用可讀來源名稱，例如「PChome 24h 商品頁」。購買 CTA 仍只看 `offers[0]`。
- Case 4：同一 URL 同時出現在 `offers[]` 與 `reference_links[]`。處理方式：允許，但新增／遷移時應避免無意義重複；像本次主商品 PChome 可同時是購買 CTA 與參考來源，因用途不同可接受。
- Case 5：參考來源很多。處理方式：本 sprint 不新增排序 metadata，依 JSON 陣列順序顯示。

## ADR

### ADR-1：以 `reference_links[]` 取代 `reference_url`

- 決策：移除 Product `reference_url`，改用 optional `reference_links: { title, url }[]`。
- 原因：Product 實務上常需要多個參考來源，單一 `reference_url` 迫使內容作者把來源塞進 `llm_description`。保留兩套欄位會造成資料來源分歧。
- 替代方案：保留 `reference_url` 再新增 `reference_links`。排除原因是長期有兩個來源，UI、搜尋與 authoring 都要定義優先序。

### ADR-2：不新增 link `kind`／`type`

- 決策：`reference_links` 每筆只包含 `title` 與 `url`。
- 原因：購買 channel、官網、規格頁、比較款等在 UI 上都只需要「可讀標題 + URL」；分類可以由標題表達，不需要再發明 enum。
- 替代方案：新增 `kind = official | review | comparison | ...`。排除原因是這會和 channel taxonomy、站內 Link content 形成第三套分類語彙，而且目前沒有明確 UI 或搜尋需求會用到它。

### ADR-3：購買連結維持 `offers[]`

- 決策：`offers[]` 的 content JSON 外觀不變，不因共用外部連結抽象而新增 `title`。
- 原因：購買連結已有 `channel_id` 可解析顯示 label，且含價格與查價時間；改動 `offers[]` 會擴大 scope 並影響 channel 頁、購買 CTA 與測試。
- 替代方案：把 `offers[]` 與 `reference_links[]` 合併為單一 `links[]`。排除原因是購買連結有 price/channel semantics，和一般參考來源混在同一 array 會讓 primary offer 與 CTA 規則變複雜。

## Milestones

### Milestone 1：Schema 與 content 遷移

> 預期結果：Product content 全面從 `reference_url` 切換到 `reference_links`，schema 不再接受舊欄位。
> 驗證方式：`pnpm content:check`、`pnpm test tests/product-schema.test.ts tests/content-taxonomy-references.test.ts`

- [x] 撰寫／更新 schema 測試：接受 `reference_links`、拒絕 `reference_url`、驗證 HTTP(S) URL 與非空 title。
- [x] 更新 `app/utils/product-schema.ts`。
- [x] 遷移所有 `content/products/*.json`。
- [ ] 更新 content authoring 文件／skill 指引。（本 worker 依派工要求不修改 instruction 檔，交由主 session 處理。）
- [x] 執行驗證並修正內容格式問題。

### Milestone 2：Public payload 與商品詳情 UI

> 預期結果：商品詳情頁能固定顯示參考資料區塊，無資料時不顯示。
> 驗證方式：相關 Vitest component/payload 測試，必要時用瀏覽器確認商品詳情頁載入。

- [x] 撰寫／更新 payload mapper 測試，確認 `reference_links` normalization 為 array。
- [x] 更新 `ProductDetailView` 與 `mapProductDetail()`。
- [x] 撰寫／更新 `product-detail.vue` 渲染測試，覆蓋有連結與無連結。
- [x] 更新商品詳情 UI。
- [x] 跑相關測試與 `pnpm content:check`。
