# Legacy Data Cutover Validation Plan

## 背景

Sprint 1 已建立 Git-backed JSON content、Nuxt Content schema、Google Sheets TSV migration script 與 static generate workflow。Sprint 2 已完成 public catalog UI、MiniSearch static index、分類、搜尋與排序。

目前 repo 內 `content/products/` 仍只有 sample product，尚未用真實 legacy Google Sheets 資料驗證整條機制。若直接進入 Inside Editing Workflow，後續 UI / PR workflow 可能建立在未經真實資料壓力測試的假設上。

## 已知事實

- Legacy app 仍保留公開 Google Sheets TSV URL，來源位於 `legacy/index.html`。
- Live TSV header 為 `name`、`brand`、`desc`、`category`、`tags`、`price_value`、`price`、`link_url`、`img_url`、`reference`。
- 現有 migration script 以 header name 取欄位，可忽略 `brand` 與 `price_value`。
- 只讀統計結果：66 rows、0 column mismatch、0 missing name。
- 暫存 migration dry-run 結果：Created 66、Skipped 0、3 個 slug collision 自動加 suffix。
- 暫存 search index build 結果：Documents 66。

## 目標

將真實 legacy 商品資料以一次性 migration 切入 Git-backed content；不保留 TSV，改以 66 筆 `content/products/*.json` 作為固定 cutover snapshot，驗證 Nuxt Content、public catalog、MiniSearch、static generate 與 runtime Google Sheets clean scan 都能在真實資料下正常運作。

## 非目標

- 不做 inside editing UI。
- 不做 PR broker、Discord bridge 或 LLM draft workflow。
- 不做價格 numeric parsing、價格排序或價格監控。
- 不修改 Product schema 的核心欄位，除非真實資料驗證證明現有 schema 不足。
- 不讓公開站 runtime 重新 fetch Google Sheets。

## 方案比較

### 方案 A：Snapshot 全量切換（已選定）

做法：使用 live TSV 作一次性 input，以固定 cutover date 產生 66 筆 `content/products/*.json`，移除 sample product，重新產生 search index，跑測試與 static generate；repo 不保留 `legacy/products.tsv`。

優點：最貼近真實上線狀態，一次驗證資料層、搜尋、UI、generate 與 runtime clean scan。

缺點：diff 較大，若資料內容需要人工修正，review 成本較高。

### 方案 B：Dry-run 報告先行

做法：只建立 migration audit/report，不提交真實商品 JSON。

優點：diff 小，適合資料品質未知時先審查。

缺點：無法驗證 Nuxt Content、MiniSearch 與 UI 在真實資料量下的行為。

### 方案 C：小批量試切

做法：只挑部分分類或前 10 筆商品進 content。

優點：diff 與 review 成本低。

缺點：容易漏掉 category、長文字、圖片 URL、slug collision 等真實資料問題。

## 選定方向

採方案 A：Snapshot 全量切換。

原因：dry-run 已顯示 66 筆資料可以無錯誤轉換，現在最大風險已從「能不能轉」變成「真實資料進站後 catalog/search/generate 是否正確」。全量 product JSON cutover snapshot 能最快驗證這個風險。

使用者決策更新：TSV 以後不會使用，因此不保存 `legacy/products.tsv`。後續 SSOT 是 product JSON；migration summary 與 schema/search/static 驗證負責提供 cutover 追溯與驗收依據。

## 初步驗收重點

- `content/products/` 由真實 66 筆商品 JSON 組成，作為固定 cutover snapshot；sample product 不再出現在公開資料。
- 不保留 `legacy/products.tsv`；migration summary 記錄 Created 66、Skipped 0 與 slug collisions。
- `public/search-index.json` 重新產生，documents count 與 published product count 一致。
- `pnpm test` 通過。
- `pnpm generate` 通過。
- `node scripts/assert-runtime-google-sheet-clean.ts` 通過，確認公開 runtime 不含 Google Sheets TSV reference。
- 首頁 catalog 在真實分類、長文、長 tag、外部圖片 URL 下仍可正常渲染。
- 搜尋可命中真實商品名稱、分類與 tags。

## 風險與後續注意

- 真實圖片來源可能有 hotlink、過期、403 或尺寸不一致問題；本 sprint 先驗證 UI 不壞，不處理圖片本地化。
- `brand` 與 `price_value` 目前不進 Product schema；若後續 inside editing 或價格監控需要，再另開 schema evolution sprint。
- Migration script 目前不直接從 URL fetch，只讀本機 TSV；本 sprint 不保留 TSV snapshot，避免 trailing empty columns 造成 diff 噪音。
- Full cutover 會產生大量 product JSON diff，review 應以 migration summary、檔案數、schema validation 與抽樣資料為主。

## 建議下一步

進入 `/ddd.spec`，建立正式 `spec.md`，把驗收條件對應到測試與 generate 驗證。spec 確認後再進 `/ddd.work` 執行全量 cutover。
