# Works

## 2026-06-14 — Repo deployment workflow implementation

- 更新 `.github/workflows/static-generate.yml`，讓 PR 只跑品質驗證，`master` push 通過品質閘門後才用 Wrangler direct upload 部署 `.output/public` 到 Cloudflare Pages project `dwselect`。
- 新增 `tests/static-generate-workflow.test.ts`，覆蓋 branch trigger、品質閘門順序、Cloudflare Pages deploy 條件與 secrets wiring。
- 更新 `README.md`，補充 production deploy、required GitHub secrets、build output、正式網址與 custom domain 首次設定注意事項。

## 2026-06-15 — Cloudflare production setup and verification

- 以 Wrangler 建立 Cloudflare Pages project `dwselect`，production branch 設為 `master`。
- 透過一次性 bootstrap token 建立 CI deploy token `dwselect-github-actions-pages-deploy`，並寫入 GitHub secrets `CLOUDFLARE_ACCOUNT_ID` 與 `CLOUDFLARE_API_TOKEN`；操作期間未輸出 token value。
- 透過 Cloudflare API 建立 Pages custom domain `dwselect.applepig.net`，並在 `applepig.net` zone 新增 proxied CNAME：`dwselect.applepig.net -> dwselect.pages.dev`。
- 完成首次 Wrangler deployment：`.output/public` 部署到 `dwselect` 的 `master` branch，Cloudflare 回傳 deployment URL `https://c381de59.dwselect.pages.dev`。
- 驗證 `https://dwselect.pages.dev/` 與 `https://dwselect.applepig.net/` 皆可用 HTTPS 載入首頁。
- 用後撤銷原始 `CF_BOOTSTRAP_TOKEN`，避免 bootstrap token 長期保留。
- Coordinator 端驗證：`pnpm test` 30 files / 233 tests passed、`pnpm lint` passed、`pnpm typecheck` passed、`pnpm generate` passed、`node scripts/assert-runtime-google-sheet-clean.ts` passed。

## 2026-06-15 — Auto publish validation fixes

- 修正首頁缺少 document title：在 `app/app.vue` 設定全站 title 為 `在找什麼嗎？ DW Select`。
- 修正 iPad 類 viewport 可短暫左右滑動再彈回的橫向 overflow：在 root / body / `#__nuxt` 與 `.compact-app-shell` 限制 `max-width: 100%` 與 `overflow-x: clip`。
- 新增 `tests/nuxt-smoke.test.ts` regression，先確認 title 與 horizontal overflow guard 會 fail，再修到通過。
- 更新 `tests/e2e/compact-app.spec.ts`，在 responsive shell E2E 驗證 title，並新增 document/body scroll width 不超過 client width 的 viewport 回歸。
- 驗證：`pnpm test tests/nuxt-smoke.test.ts` 25 passed；`pnpm test:e2e --project=tablet tests/e2e/compact-app.spec.ts` 17 passed / 3 skipped；`pnpm test` 30 files / 235 tests passed；`pnpm lint` passed；`pnpm typecheck` passed；`pnpm generate` passed；`node scripts/assert-runtime-google-sheet-clean.ts` passed。
