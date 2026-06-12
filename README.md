# DW嚴選

DW嚴選公開站使用 Nuxt SSG 與 Nuxt Content。商品資料放在 `content/products/*.json`，公開首頁只顯示 `status = "published"` 的商品。

## Local development

安裝 dependencies：

```bash
pnpm install
```

啟動本機開發伺服器：

```bash
pnpm dev
```

執行測試：

```bash
pnpm test
```

產生 public search index：

```bash
pnpm build:search-index
```

搜尋 index 會輸出到 `public/search-index.json`。`pnpm generate` 會先執行這個步驟，確保靜態輸出使用最新 Git-backed content。

## Migration

Google Sheets TSV 只作為 legacy migration input 或參考來源，不應在公開站 client/runtime fetch。

`scripts/legacy/migrate-google-sheet-products.ts` 已 deprecated，僅保留給 cutover 前 legacy 資料追溯與測試，不是新版 product content importer。008 之後的公開內容以 Git-backed `content/products/*.json`、`content/guides/*.json`、`content/links/*.json` 與 taxonomy files 為 SSOT。

如需追溯 cutover 流程，可參考一次性 content domain migration script：

```bash
node scripts/legacy/migrate-content-domain-taxonomy.ts
```

legacy Google Sheets importer 的歷史用法如下；不要用它建立新內容：

```bash
node scripts/legacy/migrate-google-sheet-products.ts legacy/products.tsv --date 2026-06-02
```

## Static generate

產生靜態輸出：

```bash
pnpm generate
```

輸出位置是 `.output/public`。產生後可檢查公開 runtime 是否仍包含 Google Sheets TSV 指標：

```bash
node scripts/assert-runtime-google-sheet-clean.ts
```
