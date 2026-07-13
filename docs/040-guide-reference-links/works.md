# Guide Reference Links Works

## 2026-07-13 implementation

### 變更摘要

- 將既有 Product-only `ProductReferenceLink` schema／type 改為中性的共用 `ReferenceLink`，由 Product 與 Guide 共用相同的非空 title 與 HTTP(S) URL 驗證。
- Guide schema 新增 optional `reference_links`；detail mapper 將未設定的值 normalize 為空陣列，Guide 列表、catalog payload 與 search index 維持不變。
- Guide detail UI 在有連結時顯示「參考資料」區塊，並對每個外連加入 `target="_blank"` 與 `rel="noopener noreferrer"`。
- 日本米入門篇新增 legacy「順便整理一下最近買的米」Facebook reference，保留既有 `source_url` 與 `body`。
- 重新產生 `content/.schema/guide.schema.json`，並同步所有 typed Guide detail test fixtures。

### TDD 記錄

- Red：`pnpm test tests/product-schema.test.ts tests/public-payload/map-guide-detail.test.ts tests/public-payload/build-detail-by-id.test.ts tests/guide-detail-render.test.ts` → 83 passed、6 failed；失敗符合 Guide schema、detail payload 與 UI 尚未支援 reference links 的預期。
- Green：同一指令 → 89 passed。
- Refactor：保留 Product／Guide 各自 detail markup，不在只有兩個使用點時抽取共用 component。

### 驗證結果

- `pnpm test tests/product-schema.test.ts tests/public-payload/map-guide-detail.test.ts tests/public-payload/build-detail-by-id.test.ts tests/guide-detail-render.test.ts tests/guide-detail-taxonomy-pills.test.ts tests/detail-hero-responsive-image.test.ts tests/content-schema-artifact.test.ts` → 7 個測試檔、102 tests passed。
- `pnpm content:check` → 16 個測試檔、162 tests passed。
- `pnpm typecheck` → 通過。
- `pnpm lint` → 通過。
- 實際開啟 `https://dwselect.toybox.local/guide/2026-06-02-japanese-rice-intro`：頁面載入成功，legacy Facebook reference 的 URL、`target="_blank"` 與 `rel="noopener noreferrer"` 正確。
