# Hotfix: Legacy Reference Backfill

## 問題描述

- **症狀**：新版 Product JSON 缺少部分 legacy Google Sheets TSV 的非空 `reference` URL，商品詳情頁因此沒有對應的舊參考貼文或影片。
- **預期行為**：可唯一對應到現有 Product 的 legacy `reference` URL，均應保留為 `reference_links[]` 的一筆 `{ title, url }`。
- **影響範圍**：30 個 Product 的詳情頁參考資料區塊；另有 1 個 Guide 需要擴充資料契約後才能保存第二個參考來源。

## 根因分析

- **根因**：先前 `reference_url` 至 `reference_links[]` 遷移依賴不完整的 Product JSON 快照，未重新比對 `legacy/index.html` 所指向 TSV 的所有非空 `reference` 欄位。
- **定位過程**：以 `legacy/index.html` 的 TSV endpoint 逐列比對目前 Product 的 offer URL、名稱／alias 與型號，再正規化檢查 `reference_links[].url`。33 筆非空 legacy reference 中，2 筆已保留、28 筆可唯一高信心對應並缺漏、1 筆已屬 Guide、2 筆因型號／產品世代改變而需使用者決定。
- **受影響的檔案**：30 個 Product JSON；完整清單由本次 Git diff 可追溯。

## 修復內容

- **修了什麼**：對 28 個高信心對應 Product 追加 legacy reference，其中 27 筆為 Facebook、Kohler 浴櫃為 YouTube。依使用者確認，Samsung M7 32 吋保留舊型號歷史 Facebook 貼文，Bose 保留標示「QC45 歷史型號」的 Facebook 貼文，共完成 30 筆 Product 回填。保留原有 reference、offer、taxonomy、使用者文案與 LLM description，並將各檔 `updated_at` 更新為 `2026-07-13T00:00:00+08:00`。
- **延後處理**：legacy「日本米入門篇」的 direct Facebook post 與現有 Guide `source_url` 是不同貼文；使用者要求 Guide 也能保存結構化參考連結，改由 `docs/040-guide-reference-links/spec.md` 定義與實作。
- **測試**：未新增測試；本次只修正 Git-backed CMS 資料，且 legacy TSV 是外部可變來源，不將其內容硬編碼為測試 fixture。
- **驗證結果**：`git diff --check` 通過；`pnpm content:check` 通過（16 個測試檔、158 個測試）。

### xreview 修正

- **[Product 回填平台與數量分解不一致]**：明確記錄 27 筆 Facebook、1 筆 Kohler YouTube，以及 2 筆使用者確認的歷史 Facebook 參考，共 30 筆 Product 回填。
