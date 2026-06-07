# Sprint 4：Discord Agent Git Publish Flow

## 目標

建立 Discord-first 的商品維護流程，讓維護者在 Discord channel / thread 與 chat bot service 討論商品內容後，由 bot 呼叫 opencode / GPT agent 產生 Git-backed content diff，並透過 GitHub PR 交給維護者 review。維護者只需要看 PR diff 並手動 merge；merge 後沿用既有 CI / static generate 發布公開站。

本 sprint 取代原本後續 inside editing UI 主線。人類操作介面收斂為 Discord 討論與 GitHub PR review，不建立給人類操作的商品管理 UI。

## 非目標

- 不做 inside editing UI、CMS、local admin 或 dashboard。
- 不讓 bot merge PR、push 到 `main`、略過 CI 或直接發布公開站。
- 不讓 agent 任意修改 app code、CI workflow、設定檔、secrets 或非商品 content 檔。
- 不做價格監控、價格歷史、定時通知或自動降價 PR。
- 不下載或本地化商品圖片；圖片仍使用來源 URL。
- 不建立新的公開站 runtime API；公開站仍維持 Nuxt SSG + static content。
- 不把 Discord 綁成唯一核心 workflow；Discord 是第一個 input adapter，核心 contract 應可被其他入口重用。
- 不在本 sprint 設計長期 memory / self-learning agent；穩定偏好需明確寫入設定或文件。

## User Story

作為 DW嚴選維護者，我想在 Discord 裡和 bot 討論商品新增、修改、查詢與刪除，以便不用操作後台 UI，也能產生可 review 的商品 PR。

作為 DW嚴選維護者，我想每個 PR 原則上只包含同一個分類的一到多筆商品異動，以便我可以用 GitHub PR diff 快速審核同一類商品的 changeset。

作為 DW嚴選維護者，我想 Delete 不刪除商品檔，而是封存商品，以便商品不再出現在公開站，同時保留 repo 內可追溯的商品資料。

作為網站訪客，我想只有維護者 merge 後的 `published` 商品才出現在公開站，以便 agent 草稿或未審核內容不會直接上線。

### 驗收條件

- [ ] Discord channel 可設定預設商品 `category`，bot 在該 channel / thread 中建立或更新商品時預設使用 channel category。
- [ ] Chat bot service 能保存 Discord thread 到 opencode session / job / changeset 的 mapping，並能在同一 thread 內持續討論多筆商品。
- [ ] Bot 支援 Product CRUD：Create 新商品 JSON、Read 查詢既有商品、Update 修改既有商品欄位、Delete 將商品改為 `status = "archived"`。
- [ ] Delete 不 hard delete `content/products/*.json`；必須更新 `status = "archived"`、`archived_at` 與 `updated_at`，公開站因既有 `published` filter 不顯示該商品。
- [ ] Create 可建立 `status = "published"` 的新商品，但發布 gate 仍是 GitHub PR merge；PR merge 前不影響公開站。
- [ ] Bot 在開 PR 前依商品最終 `category` 分組；同一 Discord thread 若包含多個 category，會自動拆成多個 category PR。
- [ ] 一個 PR 原則上只包含同一個 category 的 1 到多筆商品 Create / Update / Archive changeset。
- [ ] 商品改 category 的 Update 若只是單筆修正，歸到新 category PR；若是一群商品另開新分類，bot 建立獨立 `recategorize` PR。
- [ ] Git publish flow 只能建立 feature branch、commit、push branch 與 GitHub PR；bot 沒有 merge PR、push `main` 或修改 protected branch 的權限。
- [ ] PR broker / guardrail 會驗證 bot 建立的商品 PR diff scope，只允許 `content/products/*.json` 變更；不允許修改 app code、CI、設定檔、secrets、bot runtime metadata 或測試 fixture。
- [ ] PR broker / guardrail 會執行 product schema validation，且 `pnpm test` 至少涵蓋 CRUD mapping、archive semantics、category grouping、diff scope 與 PR payload。
- [ ] Bot 回覆 Discord 的結果包含 PR link、category、商品清單、操作摘要、validation 結果與需要人工 review 的風險提示。

## 相關檔案

- `docs/002-git-backed-content-roadmap/plan.md` — umbrella roadmap 需標記 inside editing UI 主線已被 Discord-first workflow 取代。
- `docs/002-git-backed-content-roadmap/research.md` — 既有 opencode serve / SDK、Discord input adapter 與 Git provider broker 研究脈絡。
- `content/products/*.json` — Product CRUD 的 Git-backed content SSOT。
- `app/utils/product-schema.ts` — Product JSON schema validation，作為 broker 驗證基礎。
- `app/utils/published-products.ts` — 公開站 `published` filter 與 archived 不顯示行為的既有驗證基礎。
- `services/chatbot/*` 或等價位置 — Discord input adapter、thread mapping、channel category 設定與 bot command / message handling。
- `services/chatbot/opencode/*` 或等價位置 — opencode session / job 建立、message dispatch、event stream 與 transcript retrieval。
- `services/chatbot/git-publish/*` 或等價位置 — isolated worktree、branch、commit、push、GitHub PR 建立與 diff guardrail。
- `services/chatbot/product-workflow/*` 或等價位置 — Product CRUD changeset、category grouping、archive semantics 與 PR summary mapping。
- `tests/*discord*`、`tests/*chatbot*` 或等價測試 — Discord adapter contract、CRUD workflow、category grouping、PR broker guardrails 與 archive semantics。

## 介面 / 資料結構（API / Data Structure）

本 sprint 不新增公開站 runtime API。內部通訊包含四層：Discord Gateway / Interaction event、chat bot service 內部 job contract、opencode HTTP / SSE control plane、GitHub PR broker。公開站資料通訊仍是 build-time filesystem JSON。

Channel category mapping 範例：

```json
{
  "adapter": "discord",
  "guild_id": "1234567890",
  "channel_id": "2345678901",
  "default_category": "廚房家電",
  "opencode_category_session_id": "ses_category_kitchen",
  "enabled": true
}
```

Thread changeset state 範例：

```json
{
  "thread_id": "3456789012",
  "channel_id": "2345678901",
  "default_category": "廚房家電",
  "opencode_session_id": "ses_abc123",
  "status": "drafting",
  "items": [
    {
      "client_item_id": "item-1",
      "operation": "create",
      "product_id": null,
      "final_category": "廚房家電",
      "source_url": "https://example.com/product",
      "desired_status": "published"
    },
    {
      "client_item_id": "item-2",
      "operation": "archive",
      "product_id": "2026-06-02-old-product",
      "final_category": "廚房家電"
    }
  ]
}
```

Product operation enum：

```json
["create", "read", "update", "archive"]
```

`archive` 是 CRUD Delete 的 domain operation，不是 hard delete。

Product changeset item 範例：

```json
{
  "operation": "update",
  "product_id": "2026-06-02-sample-product",
  "before": {
    "category": "生活家電",
    "status": "published"
  },
  "after": {
    "category": "廚房家電",
    "status": "published",
    "updated_at": "2026-06-07T12:00:00+08:00"
  },
  "category_group": "廚房家電"
}
```

Archive output 範例：

```json
{
  "id": "2026-06-02-old-product",
  "status": "archived",
  "updated_at": "2026-06-07T12:00:00+08:00",
  "archived_at": "2026-06-07T12:00:00+08:00"
}
```

Category PR group 範例：

```json
{
  "category": "廚房家電",
  "branch_name": "content/2026-06-07-kitchen-products",
  "pr_title": "content(廚房家電): update 3 products",
  "operations": [
    { "operation": "create", "product_id": "2026-06-07-new-rice-cooker" },
    { "operation": "update", "product_id": "2026-06-02-existing-product" },
    { "operation": "archive", "product_id": "2026-06-02-old-product" }
  ]
}
```

Git publish result 範例：

```json
{
  "thread_id": "3456789012",
  "status": "pr_created",
  "pull_requests": [
    {
      "category": "廚房家電",
      "url": "https://github.com/applepig/dwselect/pull/123",
      "branch_name": "content/2026-06-07-kitchen-products",
      "operation_counts": {
        "create": 1,
        "update": 1,
        "archive": 1
      },
      "validation": {
        "product_schema": "passed",
        "diff_scope": "passed",
        "tests": "passed"
      }
    }
  ]
}
```

Bot 建立商品 PR 時的 guardrail allowlist：

```json
{
  "allowed_paths": [
    "content/products/*.json"
  ],
  "denied_paths": [
    ".env*",
    ".github/**",
    "app/**",
    "services/**",
    "tests/**",
    "nuxt.config.ts",
    "package.json",
    "pnpm-lock.yaml"
  ],
  "denied_commands": [
    "git push origin main",
    "gh pr merge",
    "git reset --hard"
  ]
}
```

## 邊界案例

- Case 1：同一 Discord thread 產生多個 category。處理方式：bot 依最終 category 自動拆成多個 PR，並在 Discord 回覆中列出每個 PR 的 category 與商品清單。
- Case 2：Discord channel 沒有設定預設 category。處理方式：bot 不建立 Create / Update PR，先要求使用者選擇既有 category 或新增 channel mapping；Read 可照常執行。
- Case 3：使用者要求 Delete 商品。處理方式：bot 將 operation 轉為 `archive`，更新 `status = "archived"`、`archived_at`、`updated_at`，不刪除檔案。
- Case 4：使用者要求真正刪檔。處理方式：bot 拒絕 hard delete，說明本專案 Delete 語意是 archive；若未來要支援 hard delete，需另開 spec。
- Case 5：Update 找不到目標商品。處理方式：bot 回覆候選搜尋結果或要求更明確的 product id，不建立 PR。
- Case 6：Create 產生的 filename / id 與既有商品 collision。處理方式：沿用 migration slug suffix 概念追加 numeric suffix，並在 PR summary 中標示 collision resolution。
- Case 7：Agent 產生 invalid URL、缺必填欄位或 schema 不通過。處理方式：PR broker 阻止 PR 建立，bot 回 Discord 要求修正或重新產生。
- Case 8：Agent 嘗試修改非商品檔案。處理方式：diff guardrail 阻止 PR 建立，保留 job transcript 供 debug，Discord 回覆 blocked reason。
- Case 9：GitHub PR 建立成功但 CI 失敗。處理方式：bot 回報 PR 與 CI failure 狀態；是否修正由同一 thread 追加指令產生更新 commit，不自動 merge。
- Case 10：商品改 category。處理方式：單筆修正歸到新 category PR；一群商品另開新分類時建立 `recategorize` PR，避免和一般 Create / Update 混在一起。

## ADR（Architecture Decision Record）

- 決策：後續商品維護主線採 Discord-first workflow，不做 inside editing UI。
- 原因：使用者主要操作情境是在 Discord 與 agent 討論商品；GitHub PR diff 已足以作人工 review 介面，額外後台 UI 會增加維護面與重複工作。
- 替代方案：保留 inside editing UI。排除原因：會把人類操作分散到 Discord、後台與 PR 三個介面，不符合目前希望由 bot 處理內容操作的方向。

- 決策：Discord 是 input adapter，chat bot service 是本專案 workflow owner，opencode 是 agent control plane。
- 原因：Discord 負責收訊息與回報結果；chat bot service 負責 domain state、category mapping、guardrail 與 Git publish flow；opencode 負責多輪 agent session 與實際內容產生。這能避免把 domain policy 塞進 Discord adapter 或 agent prompt。
- 替代方案：直接用 Discord bot 呼叫 LLM 並操作 Git。排除原因：session lifecycle、diff guardrail、PR grouping 與權限邊界會混在一起，長期難測試。

- 決策：Create 第一版允許 `status = "published"`，但發布 gate 是 PR merge。
- 原因：使用者希望 bot 可以產生可直接上架的新商品，真正發布仍由人類看 PR diff 後 merge，維持 Git-backed 審核模型。
- 替代方案：Create 一律 `draft`。排除原因：會讓使用者每次都需要第二個 publish PR，降低 Discord workflow 的效率。

- 決策：Delete 採 archive-only，不 hard delete product file。
- 原因：Product schema 已有 `archived` 狀態與 `archived_at`；archive 可以讓商品從公開站消失，同時保留日後追溯、復原與 review 脈絡。
- 替代方案：hard delete file。排除原因：雖然 Git history 可追，但日常 content tree 會失去商品脈絡，也與既有 status enum 設計不一致。

- 決策：PR 粒度採 category changeset；同一 thread 跨 category 時自動拆 PR。
- 原因：使用者 review PR diff 時最在意同一類商品的一組變更；category PR 能降低雜訊，又保留一次討論多筆商品的 Discord UX。
- 替代方案：單商品 PR。排除原因：批次整理時 PR 過多。替代方案：允許跨 category PR。排除原因：review diff 會變成全站雜燴，違反 category changeset 原則。

- 決策：第一版 Git publish 使用 broker / guardrail 包住 branch、commit、push branch 與 GitHub PR 建立，禁止 bot merge。
- 原因：bot 的價值是產生可 review PR，不是替使用者發布；merge 權限留給 GitHub protected branch 與人類操作可降低事故風險。
- 替代方案：Discord approve 後 bot merge PR。排除原因：需要更高權限、approval audit 與失敗復原設計，不適合第一版。

- 決策：若實作需要 Discord client library，採 Node ESM service，並在 `works.md` 或後續 spec 修訂中明確記錄 dependency。
- 原因：現有專案是 Node / ESM / pnpm；chat bot service 可與 Nuxt app 分離，避免把 Discord runtime 帶進公開站 bundle。
- 替代方案：把 bot 寫進 Nuxt server route。排除原因：公開站是 SSG 模型，bot 是長駐 workflow service，兩者生命週期不同。

## Milestones

### Milestone 1：Workflow contract、狀態模型與測試骨架

> 預期結果：建立 Discord thread、channel category、Product CRUD changeset、category PR grouping 與 guardrail 的 pure contract。
> 驗證方式：`pnpm test tests/*chatbot* tests/*product-workflow*`

- [ ] 撰寫/更新測試（Red）：覆蓋 channel default category、thread changeset state、CRUD operation enum、archive semantics、category grouping 與 recategorize PR 規則。
- [ ] 實作最小功能（Green）：建立 pure helper / type contract，將 Discord event 與 Git 操作先隔離在邊界外。
- [ ] Refactor 並確認測試維持通過：保持 workflow helper 不依賴 Discord SDK、opencode API 或 GitHub CLI。

### Milestone 2：Read / CRUD 內容產生與 Product schema 驗證

> 預期結果：bot workflow 可根據既有 product JSON 做 Read，並產生 Create / Update / Archive 的 product JSON diff draft。
> 驗證方式：`pnpm test tests/product-schema.test.ts tests/*product-workflow*`

- [ ] 撰寫/更新測試（Red）：覆蓋 Read 搜尋候選、Create `published` 商品、Update 欄位修改、Archive timestamp、invalid URL、缺必填欄位與 id collision。
- [ ] 實作最小功能（Green）：建立 content read / write draft helper，產出符合 `product_schema` 的 JSON changeset。
- [ ] Refactor 並確認測試維持通過：讓 timestamp、slug / id 與 schema validation 共用既有 product 工具，不重複實作規則。

### Milestone 3：opencode job orchestration 與 isolated worktree

> 預期結果：chat bot service 可為 Discord thread 建立或恢復 opencode session，在 isolated worktree / branch 中產生 changeset。
> 驗證方式：opencode headless smoke test、`pnpm test tests/*opencode* tests/*chatbot*`

- [ ] 撰寫/更新測試（Red）：以 fake opencode client 覆蓋 session mapping、job status、event summary、permission request 與 transcript retrieval。
- [ ] 實作最小功能（Green）：串接 opencode serve / HTTP API 或受控 adapter，支援 create / resume session、send message、collect result 與 job failure 回報。
- [ ] Refactor 並確認測試維持通過：將 opencode client、job state store 與 product workflow 分層，避免 agent response 直接操作 Git publish。

### Milestone 4：GitHub PR broker、diff guardrail 與 category PR 拆分

> 預期結果：同一 thread 的 changeset 可依 category 自動拆成一到多個 branch / PR，且 guardrail 阻止越權 diff。
> 驗證方式：`pnpm test tests/*git-publish* tests/*chatbot*`、以測試 repo 或 dry-run 模式驗證 PR payload。

- [ ] 撰寫/更新測試（Red）：覆蓋 branch naming、PR title/body、multi-category split、allowed paths、denied paths、denied commands、schema validation failure 與 CI command failure。
- [ ] 實作最小功能（Green）：建立 broker dry-run 與真實 GitHub PR 建立路徑，支援 commit、push branch、`gh pr create` 或 GitHub API。
- [ ] Refactor 並確認測試維持通過：broker 不持有 merge 能力，不提供 `gh pr merge` 或 push main code path。

### Milestone 5：Discord adapter、端到端回報與文件更新

> 預期結果：維護者可在 Discord thread 觸發 CRUD 討論、送出 PR 建立、收到 PR link 與 validation summary。
> 驗證方式：Discord sandbox / dry-run E2E、`pnpm test`、`pnpm generate`

- [ ] 撰寫/更新測試（Red）：覆蓋 Discord command / message parsing、channel category lookup、PR 建立前摘要、成功回覆、blocked 回覆與 failure 回覆。
- [ ] 實作最小功能（Green）：接上 Discord adapter 與 chat bot service，支援 end-to-end dry-run 與受控真實 PR 建立。
- [ ] Refactor 並確認測試維持通過：更新 README / works，記錄啟動 bot、設定 channel category、執行 dry-run、建立 PR 與人工 merge 發布流程。
