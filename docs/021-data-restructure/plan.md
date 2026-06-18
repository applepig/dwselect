# Data Restructure Plan

## Status

- 狀態：Draft
- 建立日期：2026-06-18
- Branch：`docs/data-restructure`

## Background

目前專案已完成 Git-backed content、taxonomy、public discovery payload、search index 與 product detail payload 的多個 sprint。下一階段要重整「資料的部分」，需要先界定是 content schema、taxonomy 關係、build-time payload、authoring workflow、資料品質，或以上幾者的組合。

## Current Known Facts

- Runtime content SSOT 是 `public/api/content.json`，由 `scripts/build-public-discovery.ts` 從 Git-backed `content/` JSON 產生。
- Content SSOT 是 `content/products/*.json`、`content/guides/*.json`、`content/links/*.json` 與 `content/taxonomies/*.json`。
- Search index 由 `scripts/build-search-index.ts` 產生到 `public/search-index.json`。
- 公開 runtime 不應 fetch Google Sheets、CMS 或外部資料來源。
- 既有 product content 使用 `category_id`、`channel_id`、`tag_ids`；guide／link 使用 `category_ids`、`tag_ids`。

## Questions To Clarify

1. 資料重整主要目標是改善資料模型、資料品質、匯入／編輯流程，還是 build artifact 結構？
2. 本 sprint 是否要包含實際 content JSON 大量整理，或只調整 schema／工具／驗證？
3. 是否要把 product、guide、link 的共通欄位與差異欄位重新定義成更穩定的 domain language？
4. 是否需要新增資料品質報告，例如缺圖、空摘要、taxonomy 未使用、同義詞不足、商品連結異常？
5. 是否仍維持完全 Git-backed，不引入 CMS、Google Sheets 或資料庫？

## Candidate Directions

### Option A：資料模型重整

整理 content schema、taxonomy reference、public payload 型別與命名，讓資料欄位語意更穩定。

### Option B：資料品質與驗證重整

新增或強化 validation、reporting、content lint，讓資料缺漏與品質問題能在 CI 或 authoring 時提早被發現。

### Option C：資料產製流程重整

整理 build-time scripts，減少 search index、public discovery、route generation 各自重複讀取與轉換資料。

## Initial Recommendation

先用一個 sprint 聚焦「資料模型與品質驗證」，避免同時重構 build pipeline 與大量改 content。若後續確認 build scripts 重複轉換是主要痛點，再拆成下一個 sprint。

## Next Step

把本文件收斂成 `spec.md`：定義目標／非目標、User Story、驗收條件、測試對應與 milestones，經使用者確認後才進入實作。
