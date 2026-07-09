# Works: 036 detail page fixes

## Milestone 1: og image 修復

- **技術決策**：
  - `getOgImageUrl` 的本地 content 圖片分支由「一律回預設站圖」改為對映 `${SITE_URL}images/{domain}/{stem}.webp`（ADR-036-1）；URL 組裝沿用 `getCanonicalUrl`，不另造。
  - `pnpm build:content-images` 插入 `dev.sh cmd_generate_inner`，順序在 `assert-content-images` 之後——缺圖／壞圖由 assert 先以精確訊息中止。`cmd_generate_inner` 是本機 verify、Docker build mode、CI workflow 三條 generate 路徑的唯一收斂點，接一處全覆蓋。
  - simplify 審查後抽出 `app/utils/content-images/content-image-webp-name.ts`：「image_file → {stem}.webp」檔名規則的單一來源，`seo-metadata`（og URL）與 `scripts/build-content-images`（轉檔輸出）兩端共用，取代原本各寫一份、靠註解維繫等價的作法。純字串實作不用 `node:path`（app/utils 進 client bundle）；與 `parse(name).name` 等價的前提（IMAGE_FILE_PATTERN 禁斜線與前導點）註明於檔頭。
- **問題與解法**：
  - 舊測試斷言「content path → SITE_OG_IMAGE」是 028 時代的行為（SSG 未輸出 source path，故意打回預設圖）；036 spec 明文變更此行為，測試依新規格改寫，非弱化。
  - 邊界行為微調（主動揭露）：新 regex 要求 `images/` 後為單一路徑段；更深層路徑（如 `/products/images/sub/x.jpg`）舊版回預設圖、新版 fall through 到 `getCanonicalUrl`。此輸入在現有呼叫端不可能出現（`resolveImageFileUrl` 的 IMAGE_FILE_PATTERN 禁止斜線），不加保守 fallback。
- **simplify 審查（四角度）**：Reuse＋Altitude 指向同一根因（stem 規則雙份實作），已修如上。跳過並記錄：`build-content-images` 每次 generate 全量重轉無增量 cache（既有行為、非本次引入；修它需動 `resetOutputDirectory` 的 rm-rf 重置與孤兒清理，另開任務，量級數秒～十幾秒／次）；sharp encode 迴圈序列化（同上，加 cache 後影響縮小）；domain enum `(products|guides)` 三處重複（等第三個 domain 出現再抽，避免過早抽象）。
- **測試結果**：`pnpm test` 607 passed（含新增 helper 測試 7 條與 seo-metadata 改寫）；`./dev.sh exec ./dev.sh verify` 全鏈（test→lint→knip→typecheck→generate）綠。generate 產物全量對帳：88 個 detail 頁中 83 頁 og:image／twitter:image 指向自身 webp 且 `.output/public/images/` 檔案 100% 存在（77 product＋6 guide webp），5 頁 fallback 皆為無圖 guide。AC4（正式站 curl 抽測）待部署後人工驗收。
