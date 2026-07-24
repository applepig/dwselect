# Guide Reference Links

## 目標

讓 Guide 能保存多筆結構化的非原文參考連結，並在 Guide 詳情頁一致顯示，完成 legacy「日本米入門篇」遺漏的 Facebook 參考貼文遷移。

## 非目標

- 不取代或改變 Guide 必填的 `source_url`；它仍是原文與「看原文」CTA 的唯一目標。
- 不解析或搬移 Guide `body` 內既有 Markdown 連結。
- 不將 reference links 放入 Guide 列表、首頁 catalog 或搜尋 index。
- 不加入 legacy `reference_url` 欄位、link type enum、排序 metadata 或共用 UI 元件。

## User Story

作為內容維護者，我想在 Guide 中保存多筆結構化參考連結，以便原文以外的相關貼文、規格頁或文章不必塞進使用者撰寫的 `body`，讀者也能在詳情頁找到它們。

### 驗收條件

- [x] Guide schema 接受 optional `reference_links`，每筆必須有非空 `title` 與 HTTP(S) `url`，並拒絕 legacy `reference_url`。
- [x] Product 與 Guide 共用中性的 reference-link schema／型別，不保留 Product 專屬命名的共用抽象。
- [x] `source_url` 維持必填單一原文 URL，`reference_links` 可省略且不改變既有「看原文」連結。
- [x] Guide detail payload 一律輸出 `reference_links: []` 或其內容；Guide 列表 payload 不新增此欄位。
- [x] Guide 詳情頁只有在連結非空時顯示「參考資料」區塊；每個連結以標題顯示，使用 `target="_blank"` 與 `rel="noopener noreferrer"`。
- [x] `2026-06-02-japanese-rice-intro` 保存 legacy 的「順便整理一下最近買的米」Facebook 貼文，且不改寫 `source_url` 或 `body`。
- [x] schema、detail mapping 與 Guide detail UI 的行為測試先 Red 後 Green；`pnpm content:check`、相關 Vitest 與實際 Guide 頁面載入驗收通過。

## 相關檔案

- `app/utils/product-schema.ts` — 共用 reference-link schema、Guide schema 與 raw content type。
- `content/.schema/guide.schema.json` — 由 schema 重新產生的 JSON Schema artifact。
- `content/guides/2026-06-02-japanese-rice-intro.json` — 補入 legacy Facebook reference。
- `scripts/public-payload/map-guide-detail.ts` — detail payload normalization。
- `app/utils/public-content-view-types.ts` — `GuideDetailView` contract。
- `app/components/guide-detail.vue` — Guide 詳情頁的條件式參考資料區塊。
- `tests/product-schema.test.ts`、`tests/public-payload/map-guide-detail.test.ts`、`tests/public-payload/build-detail-by-id.test.ts`、`tests/guide-detail-render.test.ts` — schema、payload 與 UI 行為測試。

## 介面／資料結構

這是 Git-backed JSON content schema 與既有 Guide detail API payload 的變更，不新增 REST endpoint。既有 `GET /api/guides/:id.json` 會新增 normalized 欄位。

```ts
type ReferenceLink = {
  title: string
  url: string
}

type Guide = {
  source_url: string
  reference_links?: ReferenceLink[]
}

type GuideDetailView = {
  source_url: string
  reference_links: ReferenceLink[]
}
```

Guide JSON 範例：

```json
{
  "source_url": "https://www.facebook.com/share/p/1DHBMUMSLQ/",
  "reference_links": [
    {
      "title": "Facebook 參考貼文：順便整理一下最近買的米",
      "url": "https://www.facebook.com/applepig/posts/pfbid08r2XCS2kfPtkUKa7DETQiayJyKgab8vg1C9fg4kMVSpi2nqPhYJTwcigdR7xVG3Ll"
    }
  ]
}
```

## 邊界案例

- Case 1：Guide 未設定 `reference_links`。處理方式：schema 接受省略欄位，detail mapper 輸出空陣列，UI 不渲染空區塊。
- Case 2：reference URL 與 `source_url` 相同。處理方式：schema 與 payload 允許，內容編修時避免無意義重複；UI 仍依資料順序顯示。
- Case 3：title 為空或 URL 為非 HTTP(S)。處理方式：schema 拒絕資料，content gate 失敗。

## ADR

### ADR-1：Guide 與 Product 共用 `ReferenceLink`

- 決策：將既有 Product-only reference link schema／型別改為中性共用抽象，供 Product 與 Guide 使用。
- 原因：兩種內容的「可讀標題 + 外部 URL」契約完全相同；維持 Product 專屬名稱會使 Guide 依賴錯誤 domain 語意。
- 替代方案：在 Guide 建立另一套相同 schema。排除原因是欄位驗證與型別將重複且容易漂移。

### ADR-2：reference links 僅進 Guide detail payload

- 決策：不擴充 Guide 列表 row、首頁 catalog 或搜尋 index。
- 原因：參考資料是閱讀 detail 時才需要的輔助資訊，加入列表與搜尋會擴大 payload 和搜尋語意。
- 替代方案：將 URL 與標題加入所有 public content payload。排除原因是沒有對應的 UI 或搜尋需求。

## Milestones

### Milestone 1：Guide schema 與 detail payload

> 預期結果：Guide content 可保存 reference links，detail API 提供穩定的 normalized array。
> 驗證方式：schema、mapper、per-id detail tests 與 schema artifact drift guard。

- [x] 撰寫／更新測試（Red）：Guide schema 接受／拒絕行為、mapper normalization 與 per-id detail contract。
- [x] 實作最小功能（Green）：共用 reference-link schema／type、Guide schema、detail view type 與 mapper；重新產生 guide schema artifact。
- [x] Refactor：更新 typed test fixtures 為 `reference_links: []`，確認 Product 行為維持不變。

### Milestone 2：Guide detail UI 與 legacy content 回填

> 預期結果：有資料的 Guide detail 顯示安全的參考資料區塊；日本米 Guide 保留 legacy 參考貼文。
> 驗證方式：Guide detail render tests、`pnpm content:check`，以及以正式 app URL 實際開啟日本米 Guide 頁面。

- [x] 撰寫／更新測試（Red）：有連結時顯示標題與外連安全屬性，空陣列時不顯示區塊。
- [x] 實作最小功能（Green）：Guide detail UI、legacy Guide JSON reference 與 timestamp。
- [x] Refactor：沿用 Product detail 既有 markup pattern，不抽取尚無第三個使用點的共用 component。
