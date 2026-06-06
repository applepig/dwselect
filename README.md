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

Google Sheets TSV 只作為 legacy migration input 或參考來源，不應在公開站 client/runtime fetch。需要把 TSV 匯入 Git-backed product JSON 時，使用 migration script 並傳入固定 cutover date，讓 rerun 產生穩定檔名與 `id`：

```bash
node scripts/migrate-google-sheet-products.ts legacy/products.tsv --date 2026-06-02
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
