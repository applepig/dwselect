---
name: dwselect-content-authoring
description: Use ONLY when working on DW嚴選 content CMS files under content/，including product、guide、link JSON、taxonomy、content images、llm_description、price research、archive/update/add content tasks。
---

# DW嚴選 Content Authoring

Use this skill for DW嚴選 CMS content work。This project is a public static content site backed by Git JSON files。Content work means researching product data、creating or updating structured JSON、maintaining taxonomy、localizing images、and rebuilding public artifacts。

## Role

You are a researcher and structured data filler，not a personal-opinion writer。

Division of labor：the subagent does the first-draft writing。When given a target path，research the item and create or update the complete JSON file yourself（the subagent has the Write/Edit tools for exactly its one assigned file），then hand back audit notes。The coordinator's job is audit and editorial（polishing wording、confirming taxonomy、running `pnpm content:check`——not `pnpm generate`），not first-draft data entry。Only skip writing when the coordinator explicitly says research-only。

- Product `summary` and `long_description` are user-authored personal opinions。Do not write or rewrite them unless the user explicitly provides exact text；for new products with no provided opinion，set them to empty string。
- Guide `title` and `summary` are content-derived，not personal opinion：write a concise `title` and an objective 1-2 sentence `summary` summarizing what the source post covers and its core takeaway。Do not invent opinions or use subjective recommendation words（「便宜」「好用」「剛好」）；the coordinator edits the wording afterward。
- Agent-owned fields include product name、English name、model numbers、reference URL、taxonomy IDs、local image file、search aliases、and `llm_description`；for guides also `title` and the content-derived `summary`。Offers and prices are agent-maintained only when the user has not supplied explicit offer or price text。
- `llm_description` must be objective、research-backed、and useful for search or LLM understanding。Do not paraphrase the user’s subjective recommendation text。

## Default Visibility Scope

- When the user asks to update the visible website or「網頁」，default to `status: "published"` content only。
- Do not spend research/update effort on `draft`、`unpublished`、or `archived` content unless the user or coordinator explicitly assigns those items。
- Coordinator should filter batch work by content type、status、category/tag、and completed IDs before dispatching subagents。

## Files And Sources

- Products：`content/products/*.json`
- Product images：`content/products/images/*`
- Guides：`content/guides/*.json`
- Guide images：`content/guides/images/*`
- Links：`content/links/*.json`
- Taxonomy：`content/taxonomies/{categories,channels,tags,brands}.json`
- Runtime artifacts：`public/api/content.json`、`public/search-index.json`、`public/rss.xml`、`public/sitemap.xml`、`public/images/**`

Public runtime must not fetch Google Sheets、CMS、or external sources。The source of truth is Git-backed content JSON。

### Taxonomy File Shape（耐久事實，不要每次重新試誤）

All four taxonomy files are objects shaped `{ "items": [ { "id", "label", ... } ] }`——not bare arrays。Do not rediscover this with trial-and-error `jq`。To list every valid id in one go：

```bash
jq -r '.items[].id' content/taxonomies/{categories,tags,brands,channels}.json
```

To append an entry：`jq '.items += [ {...} ]' content/taxonomies/<file>.json`。Products reference `category_id`（one of categories）and `tag_ids`（functional tags plus brand ids）；offer `channel_id` references channels。

## Product Rules

- `id` must match the JSON file stem exactly。
- File names use `YYYY-MM-DD-{slug}.json`，but the slug is a stable content identifier。Do not force it to track `english_name` after creation。
- Timestamp format is ISO 8601 with timezone，for example `2026-06-18T00:00:00+08:00`。
- Keep front-facing `name` concise：prefer 32 visible characters or fewer，hard maximum 45 visible characters unless the existing name is already longer。Put full official product names、long marketing names、variant details、and disambiguation in `english_name`、`model_numbers`、`search_aliases`、or `llm_description`。
- Products use a single `category_id`。
- Products use `tag_ids` containing both functional tags and brand IDs。
- Published products must use local `image_file` and `image_url: null`。
- Do not add new categories or channels。If needed，ask the user。
- Taxonomy additions require user confirmation before editing taxonomy files。If a missing brand or tag is useful，raise it as a `taxonomy_suggestions` item with proposed ID、label、description、aliases、and rationale；do not add it silently。

## llm_description Quality

`llm_description` is an objective blog-style Markdown product decision brief for search、LLM understanding、and product detail rendering。Do not optimize for a fixed length。Write enough for a reader to correctly understand the product’s distinctive characteristics、tradeoffs、important specs、review findings、common user feedback、and reference links，similar in spirit to Kakaku、CNET、Wirecutter、or a concise buying-guide note。

Markdown format guideline：

- Write in blog-style Markdown，not as one giant paragraph。
- Use `##` headings to separate sections such as「快速判斷」、「重要規格」、「優點與限制」、「評測與使用者回饋」、「適合誰／不適合誰」、「參考來源」。Choose sections that fit the product；do not force every section when research is weak。
- Prefer bullet points for specs、pros/cons、use cases、review findings、and source lists。If something can be a bullet point，do not bury it in a long paragraph。
- Put official pages、review pages、store pages、user review pages、and discussion pages directly in Markdown links when verified，for example `- [官方產品頁](https://example.com)`。
- Keep source links inside `llm_description` so research artifacts are preserved when content JSON is written。
- Use plain Markdown only：headings、paragraphs、bullet lists、and links。Do not write raw HTML。

Length guideline：

- Simple commodity or low-information product：a short Markdown brief with 1-2 sections may be enough。
- Technical、high-price、or comparison-heavy product：use multiple Markdown sections and bullet lists。
- Do not truncate useful verified information just to fit a character count。
- Do not pad with generic filler when reliable information is limited。

Cover these decision dimensions when available：

- Product identity：type、brand、exact model／series、variant、capacity／size／color if relevant。
- Key differentiators：what makes this product different from adjacent products in the same category。
- Specs that matter for the category：not just electronics specs。Examples include ingredients、materials、dimensions、weight、power、capacity、coverage area、noise、installation constraints、compatibility、standards、included accessories、maintenance、consumables、origin、shelf life、warranty or lifecycle ratings。
- Pros and cons：objective strengths and limitations from specs、reviews、store listing、or user feedback。
- Use cases and fit：who／what scenario it fits，and what scenario it does not fit。
- Review and user feedback：summarize recurring review points when available，without pretending anecdotal feedback is universal。
- Search-useful factual aliases、model numbers、Japanese／English names、common abbreviations。

Quality bar：

- Prefer concrete nouns、numbers、comparison points、and verified caveats。
- Mention the evidence source category implicitly through facts，for example official specs、store listing、Amazon product facts。
- If the proposed text could still fit a different product in the same category，it is too generic。
- If the text mainly repeats the user’s `summary` / `long_description`，it is invalid。
- If no reviews or user feedback are found，explicitly omit that angle in the research notes；do not invent it。

Avoid：

- Repeating `summary` or `long_description`。
- Subjective recommendation words such as「便宜」、「剛好」、「很足」、「可以考慮」、「好用」。
- Unverified claims。
- Marketing-only phrasing without specs。
- Category-specific tunnel vision。For example，do not force every product into ports／wattage／protocols；choose the dimensions that matter for that product category。

If research is weak，write a narrower description and report low confidence instead of guessing。

## Research Requirements

For product add/update work，research and return or fill：

- Store URL and price。If the user provided an offer URL or price text，treat it as primary editorial input and preserve it unless explicitly told to update it。
- Product title and model number。
- Official product page or reliable reference URL。
- Key specs。
- Product image source。
- `llm_description` with confidence level。

Offer and price precedence：

- User-provided URL and price text wins over researched prices。
- User-provided purchase links belong in `offers[].url`。Do not move or replace them with official store、official spec page、or another marketplace URL。
- Official product pages、review pages、manufacturer spec pages、or alternate source pages belong in `reference_url` or the research report，not in `offers[].url`，unless the user explicitly says to change the purchase link。
- If a researched page shows a different price，return it as `observed_price` or `price_discrepancy`，not as a replacement offer。
- Do not switch channels，for example from Amazon to official store，unless the user asked to replace the offer URL or the original URL is invalid。
- If the original store page has no current offer but the user provided an approximate price，keep the approximate price and report the uncertainty。
- If the original offer URL is deleted、unavailable、or unverifiable，keep the original offer URL and price text unless explicitly told to replace them。Return `offer_status` plus possible replacement candidates for coordinator/user review。

Channel price digit obfuscation and cross-check（價格數字防呆）：

- 部分台灣通路會把價格渲染得很難 parse：momo（尤其）、Yahoo 等常把數字拆成 sprite 圖、lazy-load 節點，或用「折扣後價格」「限時折後價」「促銷價」「momo幣回饋」這類 UI 文案包住數字。直接抓 DOM text 容易抓到 UI 文案、抓錯層、或整個漏掉數字。
- 當通路頁的價格數字無法可靠讀出，或要驗證可疑數字時，改用比價聚合站交叉確認 plain-text 價格：BigGo（`https://biggo.com.tw`）與 FindPrice（`https://www.findprice.com.tw`）。用商品名／型號搜尋，對到同一通路的 listing，以聚合站的純文字價格確認 `price.amount`。
- `price.amount` 必須是已確認的數字價格。`price_text` 是前端唯一的價格顯示來源，必須乾淨且完整、可直接顯示（純數字，可帶貨幣符號、千分位，或區間「起」字尾，例如 `39,512`、`NT$39,512`、`NT$1,990 起`），不可塞入通路 UI heading 原文（如「折扣後價格」「限時折後價」）。
- `price.label`、`amount`、`currency`、`unit` 只是 metadata，前端不顯示。`label` 可選擇性記錄通路價格類型（例如「折扣價」「限時折扣」）當 metadata，但顯示完全只看 `price_text`，所以任何要顯示的修飾詞（區間「起」、幣別）都必須寫進 `price_text` 本身，不能只放在 `label`。
- 通路同時顯示多層價格（市售價／促銷價／滿件折扣價）時，記錄使用者在該 offer 實際付的可購買價格，並把分層資訊寫進研究筆記或 `price_discrepancy`，不要塞進 label。

PChome fallback：

- PChome product pages may return 429。When that happens，use the PChome API first：`https://ecapi.pchome.com.tw/ecshop/prodapi/v2/prod/{PRODUCT_ID}&fields=Id,Name,Nick,Price,Pic,Slogan,Describe,Spec&_callback=jsonp`
- If API data is insufficient or the page requires interaction，use agent-browser to inspect the page。
- Do not infer specs from product category alone。

Amazon fallback：

- Expand short URLs when possible。
- Confirm title、ASIN、model number、brand、price、main image、and product facts。
- If Amazon shows multiple variants，record the selected variant and confidence。

Review/user feedback research：

- If a page shows a rating、review count、「評論摘要」or review tab，do not stop at the aggregate score。Try to obtain readable individual review text before writing that reviews are unavailable。
- Minimum effort before claiming individual reviews cannot be obtained：open the page with `agent-browser` in the dedicated content-id session；wait for dynamic content；scroll to or click the review section/tab；click「顯示更多」、「更多評論」、pagination、sort/filter controls when present；extract text from the review container；inspect network requests for review providers or review APIs；check embedded page state、JSON-LD、script data、and provider widgets when the DOM is sparse。
- Common review providers and signals to inspect include Bazaarvoice、Trustvoice、Yotpo、Judge.me、PowerReviews、native store review endpoints、Amazon visible top reviews、Amazon `/product-reviews/{ASIN}` pages、Costco/Samsung/Electrolux review widgets、and PChome/Yahoo/momo review blocks or APIs。
- Use `agent-browser network requests` and browser `eval` to identify review API URLs、product IDs、deployment IDs、offset/limit parameters、and hidden widget state。If a review API is visible，try the first page and at least one additional page or offset when allowed，unless the source returns a hard blocker such as 401、403、429、504、login wall、CAPTCHA、or consent wall。
- When review text is readable，summarize recurring points conservatively。Distinguish official reviews、store reviews、third-party editorial reviews、and discussion/forum comments。Mention sample size and visibility limits when only a partial page is readable。
- When review text is not reliably readable，write the limitation precisely：what aggregate facts were verified、which source was tried、which interaction/API attempt failed、and why the remaining text is unavailable。Avoid vague phrases like「查詢時資源未能載入」unless you also state the concrete blocker。
- Do not use search result snippets as review evidence。They may justify further investigation，but not a final user-feedback summary unless the original page or API confirms the same facts。

## Image Quality

Images must be downloaded into the local content image folder。Do not use remote `image_url` for published products。

Preferred image sources：

- Official product page media，prefer lifestyle／in-use／room context photos when they clearly show the assigned product。
- Store main product image at the highest available resolution，especially when it is a real scene or useful scale/context shot。
- Manufacturer press or support image，prefer contextual hero photos over isolated cutout-only product renders。

Image selection preference：

- Prefer images that help readers understand scale、placement、usage context、or interior fit，not just a floating product on a transparent/white background。
- Use isolated clean product images only when contextual images are unavailable、too busy、watermarked、misleading、or fail the dimension guard。
- Avoid wide hero banners where the product occupies only a small portion of the canvas；these often look tiny in cards even when the longest edge is large。

Quality requirements：

- Must pass the repository image guard for every published content image：file exists，shortest side is at least 480px，and aspect ratio is no wider/taller than 2:1。
- Prefer at least 800px on the longest edge when available，but do not use a wide banner if the shortest side is below 480px or the aspect ratio exceeds 2:1。
- Avoid thumbnails such as `US40`、`SS64`、`SX300`、`SY300`、or obvious 300px preview URLs if a larger version exists。
- Avoid watermarked、collage、text-heavy、or tiny images unless no better source exists。
- Keep the product visible with enough padding and no severe crop。
- If only low-quality or guard-failing images are available，do not silently use them；report candidate URLs、dimensions、why they fail、and ask coordinator/user for a decision。

Image inspection workflow：

- Prefer agent-browser to inspect image `naturalWidth` / `naturalHeight` or visible page media。
- Use store API fields、HTTP metadata、or URL pattern inspection when browser inspection is enough。
- Always report selected image dimensions and whether it is contextual/lifestyle、store main、or isolated product render。
- Do not probe for or require unlisted local CLI tools for content research。Treat local PDF/OCR/image tools such as `pdftotext`、`pdfinfo`、`tesseract`、ImageMagick `magick` / `identify` as unavailable。If dimensions or PDF text cannot be verified without extra local tooling，mark them as unverified and continue。

## Browser Automation

When a research or image task needs `agent-browser`，always isolate it in a dedicated session so parallel researchers do not clobber each other。

- Pass `--session <name>` on every single `agent-browser` command。Use the content `id` as the session name（the `id` equals the JSON file stem），for example `agent-browser --session 2026-06-02-unifi-express open <url>`。
- Each `--session <name>` is an isolated browser with its own cookies、tabs、and refs。The default shared session is what makes pages and element refs collide when multiple agents run at once。
- Use the `--session <name>` flag form，not an `AGENT_BROWSER_SESSION=...` env prefix（the env-prefixed command does not match the allowed `agent-browser *` permission）。
- When finished，close only your own session with `agent-browser --session <name> close`。Never run `close --all`，which kills other researchers' sessions。

## Scope Discipline

Stay strictly within web research and single-file writing/editing。

- Do not inspect repository or filesystem state：no `git`（status、diff、log）、`ls`、`cat`、`find`、directory listing、or build/verification commands。
- You do not need to confirm what changed or what the repo looks like——the coordinator audits and runs verification。
- Read，create，and edit only your assigned target JSON file via the read/write/edit tools，and use bash only for the explicitly allowed research tools（`agent-browser`、`curl`、`node`、`python`、`file`、`jq`）。

## Verification For Content-Only Tasks

Content-only tasks validate format、schema-readable content、taxonomy references、and images。Do not validate the current CMS dataset by hard-coded counts or specific product IDs。

**The single gate is `pnpm content:check`。** Do not hand-roll taxonomy-reference validation in bash, and do not stack a full `pnpm generate` on top to feel safe。`scripts/content-check.mjs` runs both halves of the real gate in one call：JSON syntax validation across all content JSON, then the targeted Vitest suites that read the real `content/` files。It finishes in ~2s。

```bash
pnpm content:check
```

What it covers：

- JSON syntax across `content/{products,guides,links,taxonomies}/*.json`（catches malformed JSON before the schema runs，replacing `jq empty`）。
- zod schema validation against every published item (required fields、`offers` min length、`image_file` required for published、`image_url: null` for products，timestamp format)。
- every `category_id` / `tag_ids` (including brand IDs) resolves to an existing taxonomy entry。This is why new brand/tag taxonomy entries must be added before the check passes。
- every published `image_file` exists and passes the guard (shortest side >= 480px，aspect ratio <= 2:1)。

**`pnpm generate` is not part of the content gate。** The dev server already has content HMR，so adding or editing content JSON reflects live without a generate step，and `pnpm content:check` is the data gate。Only run `pnpm generate` when you have an explicit reason the lightweight check cannot cover（e.g. verifying SSG route output、a build-script change），and state that reason first。Caveat when you do：a host `pnpm generate` collides with a running dev container on the shared `.nuxt` / Vite cache，so stop the dev container or run it in an isolated worktree first——never the mv-the-blocker-aside dance just to make a full build pass。

Run additional Vitest only when modifying schema、runtime logic、build scripts、or test logic。If an existing test fails because it hard-codes content count、specific content ID、or generated search document count，remove or refactor the bad test。Do not update expected counts to match new CMS data。

## Batch Workflow

For category/tag cleanup or multi-product enrichment，use this coordinator flow：

1. Filter target IDs first，usually by `status: "published"` plus `category_id` or `tag_ids`，and exclude already completed IDs。
2. Dispatch one subagent per product。Each subagent gets exactly one target JSON path。
3. Let each subagent create or update its assigned target JSON file itself when implementation work is requested（the subagent writes the file；the coordinator does not type the data in）。
4. Coordinator audits all written/changed JSON files (editorial pass)：checks names are concise，checks product `summary` / `long_description` were preserved，checks guide `title` / `summary` read well and stay objective，confirms taxonomy IDs exist，and confirms offers were not replaced。
5. Coordinator adds any confirmed new taxonomy entries，then runs `pnpm content:check`（not `pnpm generate`），then confirms the live page renders。

## Subagent Dispatch Contract

When delegating content research/update to a subagent，the prompt must explicitly tell it to use this skill and must restate the core constraints：

- Read and follow `dwselect-content-authoring`。
- One subagent handles exactly one target JSON file。
- If this is implementation work，create or update the assigned target JSON file yourself；write a complete schema-valid file（`id` matching the file stem，required fields，ISO 8601 `+08:00` timestamps，`status: "published"` + `published_at` for new published content）。The coordinator audits、does editorial，and runs `pnpm content:check`（not `pnpm generate`）。If this is research-only，do not modify files。
- For products，do not write or rewrite `summary` and `long_description`（empty string when no user opinion）。For guides，write a content-derived `title` and an objective 1-2 sentence `summary`。
- Default to `published` items when the task is about visible website content。
- Keep `name` concise：prefer 32 visible characters or fewer，hard maximum 45；put full official names in `llm_description`、aliases、or model fields。
- Provide sources、confidence、and unresolved assumptions。
- For `llm_description`，write a blog-style Markdown brief with headings、bullet points、review/user feedback when available、and verified reference links；research specs instead of paraphrasing user text。
- For review/user feedback，do not give up after static fetch。If rating/count or a review widget exists，use the review research workflow：agent-browser dynamic page、review tab/scroll/show-more interactions、DOM text extraction、network/API inspection、and precise blocker reporting before claiming individual reviews are unavailable。
- For images，prefer contextual/lifestyle or in-use official/store images over isolated product-only renders；the chosen image must pass the guard（shortest side >= 480px，aspect ratio <= 2:1）and the subagent must report dimensions and source type。
- Preserve user-provided offer URL and price text unless explicitly asked to replace them。
- If offer is unavailable or unverifiable，keep it and report `offer_status` plus replacement candidates instead of changing it。
- Add official product/spec pages to `reference_url`，not by replacing the user-provided offer link。
- Raise missing brand/tag/category/channel needs as `taxonomy_suggestions`；do not edit taxonomy without user confirmation。
- For any `agent-browser` use，pass `--session <content-id>` on every command so parallel researchers do not collide，and close only that session（never `close --all`）。
- Stay within research and writing/editing the one assigned JSON file。Do not inspect repo/filesystem state（no `git`、`ls`、`cat`、`find`、build/verify，and never `pnpm generate`）；the coordinator audits、does editorial，and runs `pnpm content:check`。

Suggested one-product implementation prompt shape：

```text
Read and follow `dwselect-content-authoring`。This is implementation work for exactly one content JSON：<path>。

Create or update that JSON file yourself（write the complete schema-valid file）。Do not modify `summary`、`long_description`、`id`、`status`、or user-provided `offers[].url` / `price_text`。Keep `name` concise（prefer <=32 visible characters，hard max 45）；put full official names in `llm_description`、`model_numbers`、or `search_aliases`。Preserve existing taxonomy IDs；if a missing brand/tag is useful，return `taxonomy_suggestions` instead of editing taxonomy。

Research official/spec/store/review sources，then write agent-owned fields：`name`、`english_name`、`model_numbers`、`search_aliases`、`reference_url`、`llm_description`，and clearly missing price currency/unit metadata when verified。For a guide，also write a content-derived `title` and an objective 1-2 sentence `summary`，and keep `source_url` as the post URL。For reviews，if rating/count or a review widget exists，use agent-browser dynamic inspection、review interactions、DOM extraction、and network/API inspection before claiming individual review text is unavailable。If you use agent-browser，pass `--session <content-id>` on every command and close only that session。Do not run `git`、`ls`、`cat`、`find`，build/verify，or `pnpm generate`；the coordinator audits、does editorial，and runs `pnpm content:check`。

Return：files changed、field summary、sources、confidence、offer_status、image source type、image dimensions、taxonomy_suggestions、unresolved assumptions。
```
