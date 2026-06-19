# Search Field Boosting

## 目標

讓站內搜尋結果更符合內容語意重要性：標題命中應優先於 tag，tag 應優先於 DW 怎麼說，DW 怎麼說應優先於 LLM 怎麼說，其他輔助欄位最低。

## 非目標

- 不調整搜尋頁 UI 分區順序；搜尋結果仍維持產品、指南、連結三區顯示。
- 不更換 MiniSearch 或導入後端搜尋服務。
- 不調整 popular tags、搜尋歷史或 autocomplete UI。

## User Story

- 作為使用者，我搜尋商品或內容關鍵字時，希望標題和人工 tag 的命中比長描述或 AI 描述更靠前，避免低關聯內容因描述文字較長而壓過核心命中。

## 驗收條件

- 搜尋欄位必須支援加權排序，權重語意為：`title > tag_labels > description(DW 怎麼說) > llm_description(LLM 怎麼說) > 其他`。
- Product 的 `llm_description` 必須從既有混合 `search_text` 拆成獨立可加權欄位。
- Product 的 `search_aliases`、`model_numbers`、taxonomy aliases 仍必須可搜尋，但不得與標題或 tag 同權重。
- Guide 與 Link 仍必須可用 title、summary、category、tag 與 tag aliases 搜尋。
- Autocomplete 與送出搜尋必須共用同一套權重排序；autocomplete 仍只取前 12 筆。
- 新增或更新測試覆蓋：標題命中優先於 tag；tag 命中優先於 DW 描述；DW 描述命中優先於 LLM 描述；其他輔助欄位仍可搜尋但排序較低。

## ADR

- 使用 MiniSearch 內建 `boost` 進行查詢期加權，不新增自訂排序器。理由是現有搜尋已使用 MiniSearch score，boost 能以最小改動調整 relevance，且 autocomplete 與送出搜尋可自然共用。
- 欄位拆分採 inline-first：先在 `SearchDocument` 增加必要的 non-enumerable search-only fields，不改 public summary payload。

## 建議初始權重

| 欄位 | 權重 | 語意 |
| --- | ---: | --- |
| `title` | 8 | 標題 |
| `tag_labels` | 5 | 人工 tag |
| `description` | 3 | DW 怎麼說 |
| `llm_description` | 2 | LLM 怎麼說 |
| `summary` | 1.5 | 卡片短摘要 |
| `search_aliases_text` | 1 | 搜尋別名 |
| `model_numbers_text` | 1 | 型號 |
| `taxonomy_aliases_text` | 1 | taxonomy aliases |
| `category_labels` | 1 | 分類 |
| `channel_label` | 1 | 通路 |

## Milestones

### Milestone 1：搜尋欄位拆分與 boost

- Red：新增搜尋排序測試，先證明目前未加權排序不符合 `title > tag > description > llm > other`。
- Green：拆分 search-only fields，導入 MiniSearch `boost`，維持現有搜尋 contract。
- Refactor：只整理必要型別與常數，避免改動 UI 或 unrelated search flow。

### Milestone 2：驗證與紀錄

- 跑 `pnpm test tests/search-index.test.ts tests/client-search.test.ts`。
- 視修改範圍補跑 `pnpm test`。
- 更新 `docs/024-search-field-boosting/works.md`。
