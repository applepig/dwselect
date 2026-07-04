# Product Reference Links Works

## 2026-07-04 implementation

### 變更摘要

- 以 TDD 更新 Product schema：新增 optional `reference_links: { title, url }[]`，共用 `ProductExternalTarget` URL 抽象，`offers[]` content 外觀維持不變。
- 移除 Product schema 對 `reference_url` 的接受；strict schema 會拒絕 legacy `reference_url`。
- 遷移所有 `content/products/*.json`：非空 `reference_url` 轉為一筆 `reference_links`，`null` 則省略欄位。
- 更新 `content/products/2026-07-04-kinloch-anderson-traveler-20-carry-on.json`，加入三筆指定參考連結：PChome 主商品、台灣虎航行李規定、Allez 比較款。
- 更新 public detail view model 與 mapper，`mapProductDetail()` 將缺值 normalize 為 `reference_links: []`。
- 更新商品詳情頁 UI：有 reference links 時渲染「參考資料」區塊，連結使用 `target="_blank"` 與 `rel="noopener noreferrer"`；無資料時不渲染空區塊。
- 同步更新相關 tests／fixtures 與 legacy compact migration helper，避免 schema drift。

### TDD 記錄

- Red：先更新 `tests/product-schema.test.ts`、`tests/public-payload/map-product-detail.test.ts`、`tests/product-detail-taxonomy-pills.test.ts`。
  - `pnpm test tests/product-schema.test.ts tests/public-payload/map-product-detail.test.ts tests/product-detail-taxonomy-pills.test.ts` → 3 failed files，16 failed tests（預期失敗：schema 仍要求 `reference_url`、payload/UI 未輸出／渲染 `reference_links`、content 尚未遷移）。
- Green：更新 schema、payload mapper、ProductDetailView、product detail UI、CSS、content JSON 與 fixtures。
- Refactor／同步：compact legacy migration helper 改為從 legacy `reference_url` 產生 `reference_links`，避免 `product_schema.parse()` 漂移。

### 驗證結果

- `pnpm test tests/product-schema.test.ts tests/public-payload/map-product-detail.test.ts tests/product-detail-taxonomy-pills.test.ts` → 3 files passed，65 tests passed。
- `pnpm content:check` → content JSON 語法 OK；15 files passed，154 tests passed；全部通過。
- `pnpm test tests/migrate-product-compact-schema.test.ts` → 1 file passed，7 tests passed。
- `pnpm test` → 82 files passed，634 tests passed。
- `pnpm typecheck` → 通過。
- `pnpm lint` → 通過。

### 未執行／交接

- 未修改 `AGENTS.md`、`CLAUDE.md`、`content/AGENTS.md`、`.opencode/skills/dwselect-content-authoring/SKILL.md`；本項依派工明確排除，交由主 session 處理。
- 尚未做瀏覽器人工頁面驗收；本次以 component test、payload test、content check、full Vitest、typecheck、lint 驗證。
