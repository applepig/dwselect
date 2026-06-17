# Content File Relationships and Image File Resolution

## 目標

整理 `content/` 來源檔、taxonomy、圖片實體檔、公開 URL 與 runtime view model 的相對關係，並導入 `image_file` 作為本地圖片的 content source 欄位，讓 JSON 不需要手寫 `/images/products/` 或 `/images/guides/` 這類公開路徑。

## 非目標

- 不改變 Products、Guides、Links 的公開 routing
- 不新增 `/images/links/` 或 `content/links/images/`
- 不導入外部 CMS、Google Sheets 或遠端資料來源
- 不做圖片壓縮、裁切、responsive image 或 CDN
- 不改變 taxonomy 的資料模型

## User Story

作為 DW嚴選的內容管理者，我想要在 content JSON 中只填本地圖片檔名，並有一份清楚的 content 檔案關係文件，以便人類與 agent 新增內容時不需要理解 Nitro publicAssets 的公開路徑細節，也能產出可被 runtime 正確顯示的內容。

### 驗收條件

- [ ] 新增 project-level `docs/CONTENT.md`，說明 `content/products/`、`content/guides/`、`content/links/`、`content/taxonomies/`、圖片目錄、公開 URL、search index 與 SSG output 的關係
- [ ] Product / Guide content JSON 支援本地圖片欄位 `image_file`，值只允許檔名（例如 `2026-06-02-benq-rd280u.jpg`），不允許子目錄、`..`、query、hash 或 unsupported extension
- [ ] Product 圖片來源必須剛好擇一：本地 `image_file` 或 HTTP(S) `image_url`
- [ ] Guide 圖片來源可為本地 `image_file`、HTTP(S) `image_url` 或無圖，但不得同時填 `image_file` 與 `image_url`
- [ ] Product / Guide runtime view model、resource rows 與 search index 仍輸出可直接給 `<img src>` 使用的 resolved URL（例如 `/images/products/2026-06-02-benq-rd280u.jpg`）
- [ ] 既有本地圖片內容從 `image_url: "/images/{type}/{filename}"` 遷移為 `image_file: "{filename}"`，且公開 UI 行為不變
- [ ] HTTP(S) `image_url` 作為圖片下載失敗或外部圖片 fallback 時仍可使用，但本地圖片不得再用 `image_url` 表示
- [ ] Link 不支援 `image_file`，`image_url` 僅允許 HTTP(S) URL、`null` 或省略
- [ ] `scripts/localize-content-images.ts` 下載圖片後寫入 `image_file`，不再把本地公開 URL 寫回 JSON
- [ ] Content 測試驗證每個 `image_file` 對應的實體檔存在於 `content/products/images/` 或 `content/guides/images/`
- [ ] `content/AGENTS.md` 更新為 `image_file` authoring 流程，並連到 `docs/CONTENT.md`

> 2026-06-16 註：018 static generate performance sprint 已 supersede Product 圖片 fallback 契約。Product 不再接受 external `image_url` 作為圖片來源；published Product 必須使用本地 `image_file`，沒有本地圖片的 legacy / draft Product 必須維持 draft 且 `image_file: null`、`image_url: null`。Guide / Link 的 external `image_url` 規則不受此註記影響。
- [ ] CI 等級驗證通過：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`

## 相關檔案

- `docs/CONTENT.md` — 新增 project-level content 檔案關係文件
- `content/AGENTS.md` — Codex content authoring 指令，需改用 `image_file`
- `app/utils/product-schema.ts` — Product / Guide 圖片欄位 schema 與 filename validation
- `app/utils/published-products/shared.ts` — Product card 圖片 resolved URL
- `app/utils/published-products/product-detail.ts` — Product detail hero image resolved URL
- `app/utils/published-products/resource-rows.ts` — Guide / Link resource row 圖片 resolved URL
- `app/utils/search/search-index.ts` — search index 圖片 resolved URL
- `scripts/localize-content-images.ts` — 圖片下載後寫入 `image_file`
- `nuxt.config.ts` — Nitro `publicAssets` 映射仍維持 `content/products/images/` → `/images/products/`、`content/guides/images/` → `/images/guides/`
- `content/products/*.json`、`content/guides/*.json` — 既有內容遷移
- `content/products/images/`、`content/guides/images/` — 圖片實體檔目錄
- `tests/product-schema.test.ts`、`tests/localize-content-images.test.ts`、`tests/search-index.test.ts`、`tests/published-products/*.test.ts` — 需更新或補測

## 介面／資料結構

### Content Source JSON

Product 本地圖片使用 `image_file`，且 `image_url` 必須為 `null` 或省略：

```json
{
  "id": "2026-06-02-benq-rd280u",
  "image_file": "2026-06-02-benq-rd280u.jpg",
  "image_url": null
}
```

Guide 本地圖片使用 `image_file`，且 `image_url` 必須為 `null` 或省略：

```json
{
  "id": "2026-06-02-aeron-chair",
  "image_file": "2026-06-02-aeron-chair.jpg",
  "image_url": null
}
```

外部圖片 fallback 使用 HTTP(S) `image_url`，此時 `image_file` 必須為 `null` 或省略：

```json
{
  "id": "2026-06-02-example-product",
  "image_file": null,
  "image_url": "https://example.com/product.jpg"
}
```

### Runtime Resolved URL

Runtime 不直接把 `image_file` 傳給 UI，而是在 server/build/runtime data mapping 階段 resolve 成可公開存取的 URL：

| Content type | `image_file` | Resolved URL |
|--------------|--------------|--------------|
| Product | `foo.jpg` | `/images/products/foo.jpg` |
| Guide | `bar.webp` | `/images/guides/bar.webp` |
| Link | 不支援本地 `image_file` | 使用 HTTP(S) `image_url` 或 `null` |

## 邊界案例

- `image_file` 含 `/`、`..`、`?`、`#` 或空字串：schema validation 失敗
- `image_file` 副檔名不是 `jpg`、`jpeg`、`png`、`webp`、`gif`、`avif`：schema validation 失敗
- `image_file` 指向不存在的實體檔：content relationship 測試失敗
- Product 同時缺少 `image_file` 與 HTTP(S) `image_url`：schema validation 失敗
- Guide 同時缺少 `image_file` 與 HTTP(S) `image_url`：允許無圖時必須明確填 `null`，runtime 輸出 `null`
- Product / Guide 同時填 `image_file` 與 HTTP(S) `image_url`：schema validation 失敗，避免雙重來源造成歧義
- Product / Guide 使用本地公開 URL（例如 `/images/products/foo.jpg`）填入 `image_url`：schema validation 失敗，需改填 `image_file`
- Link 填 `image_file` 或任何 local image path（例如 `/images/links/foo.jpg`、`/images/products/foo.jpg`）：schema validation 失敗

## ADR

### ADR-1：本地圖片使用 `image_file`，不讓 `image_url` 同時代表 URL 與檔名

- **決策**：新增 `image_file` 表示 content-relative local image filename；`image_url` 僅保留給 HTTP(S) fallback
- **原因**：`image_url` 語意是可直接使用的 URL。若允許填檔名，會讓 source data 和 runtime data 混在同一欄位，agent authoring 與 UI mapping 都容易誤判
- **替代方案**：讓 `image_url` 可填檔名並 auto resolve。此方案 migration 較小，但欄位名稱與資料語意不一致，長期文件成本較高

### ADR-2：新增 `docs/CONTENT.md` 作為 project-level content model 文件

- **決策**：新增 `docs/CONTENT.md`，集中記錄 content source、taxonomy、圖片、公開路徑與 generated artifacts 的關係
- **原因**：目前 `docs/` 只有 sprint 文件包，長期 content model 事實散落在 sprint spec、AGENTS.md 與 code 中；project-level 文件可作為人類與 agent 的共同入口
- **替代方案**：只更新 `content/AGENTS.md`。此方案能改善 Codex authoring，但無法作為專案層級 SSOT，也不利於未來 review

## Milestones

### Milestone 1：定義 content image resolution contract

> 範圍：`app/utils/product-schema.ts`、新增或調整 image resolver、相關 unit tests
> 驗證：`pnpm test tests/product-schema.test.ts tests/published-products/shared.test.ts tests/published-products/product-detail.test.ts tests/published-products/resource-rows.test.ts tests/search-index.test.ts`
> 預期結果：Product / Guide 可用 `image_file` 表示本地圖片，runtime/search 輸出 resolved URL

- [x] Red：補 schema、resolver、runtime mapping 測試
- [x] Green：實作最小 resolver 與 schema 支援
- [x] Refactor：消除重複 URL 拼接邏輯，維持 helper 邊界清楚

### Milestone 2：遷移既有 content 與 localize script

> 範圍：`content/products/*.json`、`content/guides/*.json`、`scripts/localize-content-images.ts`、相關 tests
> 驗證：`pnpm test tests/localize-content-images.test.ts tests/product-schema.test.ts`
> 預期結果：既有本地圖片 JSON 改用 `image_file`；localize script 新下載圖片後寫入 `image_file`

- [x] Red：補 migration 後的 content relationship 測試與 localize script expectation
- [x] Green：遷移 JSON 並更新 script
- [x] Refactor：確認 local image 與 HTTP(S) fallback 流程清楚分離

### Milestone 3：整理文件與完整驗證

> 範圍：`docs/CONTENT.md`、`content/AGENTS.md`、`public/search-index.json`、SSG output
> 驗證：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`
> 預期結果：人類與 Codex 都能依文件正確新增 content；static output 圖片路徑仍可載入

- [x] 撰寫 `docs/CONTENT.md`
- [x] 更新 `content/AGENTS.md` 的圖片 authoring 流程
- [x] 重建 search index / static output 並完成 CI 等級驗證
