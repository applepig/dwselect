# Description Field Rename Works

## 2026-08-10 implementation

### 變更摘要

- 三種 content type（Product / Guide / Link）的 `summary` 欄位改名為 `short_description`，共 108 個 content JSON，以 `OrderedDict` 保序改寫、不動其他欄位順序。
- zod SSOT `app/utils/product-schema.ts` 三處同步改名，`content/.schema/*.json` 由 SSOT 重新產生。
- Search document 一併正名：`summary` → `short_description`、`description` → `long_description`，`SEARCH_FIELDS`／`SEARCH_FIELD_BOOSTS`（long 3、short 1.5）／`SEARCH_STORE_FIELDS` 同步。
- View model、`scripts/public-payload/` mapper、UI component 與 page 的屬性存取全部跟進；34 個測試檔批次改名（`tests/e2e/` 不含資料欄位，未動）。
- `content/AGENTS.md`、Claude／opencode 的 skill 與 researcher agent 文件同步欄位名，並加註舊名 `summary` 的對照，避免讀到 docs/020 時誤判。

### 驗證結果

- 容器內 `./dev.sh exec ./dev.sh verify`（test→lint→knip→typecheck→generate）EXIT=0：678 tests passed、lint 與 knip 無告警、typecheck 0 error、prerendered 1578 routes in 63.173s。
- `pnpm content:check` → 162 tests passed。
- CI run 31378402387 全綠，含 `Run static preview E2E`（171s，3 個 viewport）——本機 static preview 因產物綁定 `dwselect.applepig.net` 而 hydration mismatch，搜尋建議只能靠這輪 CI E2E 覆蓋。
- 實際開啟 `.output/public` 的 static preview 確認：首頁卡片短評正常、詳情頁「DW 怎麼說」顯示完整（改名前被拆成兩半的 tovolo 文字現已完整）、價格顯示 `$16.13`。

## 2026-08-10 PR #26 review fixes

### Finding 1「Refresh updated_at for the renamed product records」— 不採納

- Codex 主張 108 筆改名紀錄應更新 `updated_at`，理由是 `buildSitemapUrlEntry` 用它產生 `<lastmod>`，不更新會讓公開 metadata 反映不出這次變更。
- **照做會弄壞網站排序。** `app/utils/content/compare-products.ts` 用 `updated_at` DESC 當**主要排序鍵**（`compare-guides.ts`、`compare-links.ts`、`map-related-product-card.ts` 同樣）。把 108 筆一次改成同一個遷移時間戳，主鍵會全部並列，排序 fallback 到 category `sort_order` 再 fallback 到名稱字母序——首頁的「最新在前」會整個消失。sprint 034 `hotfix-product-newest-sort` 才修過這個維度。
- 次要理由：本次是純 JSON key 改名，rendered output 逐字元不變。把 108 個頁面的 `<lastmod>` 全部推到今天，等於對搜尋引擎謊報 108 個頁面有內容更新。
- `updated_at` 的其他消費端不受影響：RSS `pubDate` 用 `published_at ?? updated_at`，published 內容都有 `published_at`。
- 處置：程式碼與資料維持原狀，把「schema-only 改名不動 `updated_at`」寫進 spec 的「明確不改」表，讓後續 review 讀得到依據。

### Finding 2「Add the required sprint completion record」— 採納

- `docs/043-description-field-rename/` 原本只有 `spec.md`，缺 `works.md`，違反 DDD 的 Sync on Finish（commit 前先更新工作紀錄）。
- 處置：補上本檔，記錄變更摘要、驗證結果與 review 處置。
