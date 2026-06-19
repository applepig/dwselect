# Search Field Boosting Works

## 2026-06-18

### Recon

- 讀取 `docs/024-search-field-boosting/spec.md`，確認權重語意為 `title > tag_labels > description > llm_description > 其他`。
- 檢查 `app/utils/search/search-index.ts`，沿用既有 `description/search_text` non-enumerable search-only field 寫法擴充欄位。
- 檢查 `app/utils/search/client-search.ts`，確認 autocomplete 透過 `getClientSearchResults()` 共用 `querySearchIndex()` 排序後再 slice 前 12 筆，不需改 UI flow。

### Red

- 在 `tests/search-index.test.ts` 新增同一 query 的排序 regression：title 命中需高於 tag，tag 高於 DW description，DW description 高於 LLM description，LLM description 高於 `search_aliases`、`model_numbers`、taxonomy aliases。
- 補上 Guide／Link 仍可透過 tag aliases 搜尋的測試。
- Red 驗證：`pnpm test tests/search-index.test.ts tests/client-search.test.ts` 失敗於新增排序測試，錯誤為 title 排序未高於 tag。

### Green / Refactor

- 在 `SearchDocument` 新增 `llm_description`、`search_aliases_text`、`model_numbers_text`、`taxonomy_aliases_text` search-only fields。
- 將 Product 的 `llm_description` 從混合 `search_text` 拆出，並將 `search_aliases`、`model_numbers`、taxonomy aliases 分別放入低權重欄位；`search_text` 保留 product `english_name`。
- `querySearchIndex()` 加入 MiniSearch 查詢期 `boost`：title 8、tag_labels 5、description 3、llm_description 2、summary 1.5、其他欄位 1。
- Guide／Link 保留 title、summary、category、tag 與 tag aliases 搜尋；tag aliases 改放 `taxonomy_aliases_text`。

### 驗證

- `pnpm test tests/search-index.test.ts tests/client-search.test.ts`：30 passed。
- `pnpm test`：350 passed。
- `pnpm lint`：passed。
- Coordinator 驗收重跑 `pnpm test tests/search-index.test.ts tests/client-search.test.ts`：30 passed。
- Coordinator 驗收重跑 `pnpm lint:file -- app/utils/search/search-index.ts tests/search-index.test.ts tests/client-search.test.ts`：passed。
- Coordinator 驗收重跑 `pnpm test`：350 passed。
- `pnpm typecheck`：未通過；Nuxt 載入階段失敗於 `Could not load @nuxt/image. Is it installed?`，未進入本次搜尋程式碼型別檢查。
- 後續追查 typecheck：`node_modules/@nuxt` 缺少 `image` link；執行 `pnpm install --frozen-lockfile` 重建 install link 後，`pnpm typecheck` 通過。

### 未解風險

- `pnpm typecheck` 原本受本機 install link 不完整阻塞，已用 frozen install 重建並補跑通過。
- 工作區原本已有 unrelated dirty changes；本次未整理或 revert 任務外變更。
