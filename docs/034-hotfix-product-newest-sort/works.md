# Hotfix: Product 全部列表 newest-first 排序

## 問題描述

- **症狀**：正式站「全部」列表沒有在前段顯示剛新增的金安德森 Traveler 20 吋登機箱。
- **預期行為**：Product 全部列表應以 newest first（`updated_at` 新到舊）為第一排序鍵。
- **影響範圍**：首頁「全部」商品 cards 與共用 canonical product comparator；search baseline 因共用 comparator 同步受影響。

## 根因分析

- **根因**：`compareProducts` 先用 category sort_order 排序，只有同分類內才比 `updated_at`，導致 `household` 商品即使更新日期最新，也排在所有較前面分類之後。
- **定位過程**：確認正式站 `/api/content.json` 已含 `2026-07-04-kinloch-anderson-traveler-20-carry-on`，詳情頁回 200；該商品位於 cards 第 57 筆，排位由 category sort_order 壓過 `updated_at` 造成，非部署缺漏。
- **受影響的檔案**：`app/utils/content/compare-products.ts`、`tests/content/compare-products.test.ts`、`tests/search-index.test.ts`、`docs/020-product-detail-info-architecture/spec.md`、`docs/021-data-restructure/spec.md`、`docs/021-data-restructure/works.md`。

## 修復內容

- **修了什麼**：將 product canonical comparator 改為 `updated_at desc → category sort_order → compareText(name)`，讓「全部」真正 newest first，並保留同時間商品的分類穩定排序。
- **測試**：先更新 `tests/content/compare-products.test.ts` 建立 Red state，再同步 `tests/search-index.test.ts` 的 catalog-aligned baseline expected order。
- **驗證結果**：`pnpm test tests/content/compare-products.test.ts` 通過；`pnpm test tests/public-discovery.test.ts tests/search-index.test.ts tests/published-products/compact-app.test.ts tests/server-content-routes.test.ts` 通過；`pnpm test` 通過（82 files／635 tests）；`pnpm lint` 通過；`pnpm typecheck` 通過；`DWSELECT_ALLOW_HOST_GENERATE=1 pnpm generate` 通過；`node scripts/assert-runtime-google-sheet-clean.ts` 通過。第一次 `pnpm generate` 因 `.output` 為 root-owned generated artifact 被專案 guard／檔案權限擋下，修正 `.output` ownership 後重跑成功。
