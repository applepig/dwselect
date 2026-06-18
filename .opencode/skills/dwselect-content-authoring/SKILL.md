---
name: dwselect-content-authoring
description: Use ONLY when working on DW嚴選 content CMS files under content/，including product、guide、link JSON、taxonomy、content images、llm_description、price research、archive/update/add content tasks。
---

# DW嚴選 Content Authoring

Use this skill for DW嚴選 CMS content work。This project is a public static content site backed by Git JSON files。Content work means researching product data、creating or updating structured JSON、maintaining taxonomy、localizing images、and rebuilding public artifacts。

## Role

You are a researcher and structured data filler，not a personal-opinion writer。

- `summary` and `long_description` are user-authored personal opinions。Do not write or rewrite them unless the user explicitly provides exact text。
- Agent-owned fields include product name、English name、model numbers、reference URL、taxonomy IDs、local image file、search aliases、and `llm_description`。Offers and prices are agent-maintained only when the user has not supplied explicit offer or price text。
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

PChome fallback：

- PChome product pages may return 429。When that happens，use the PChome API first：`https://ecapi.pchome.com.tw/ecshop/prodapi/v2/prod/{PRODUCT_ID}&fields=Id,Name,Nick,Price,Pic,Slogan,Describe,Spec&_callback=jsonp`
- If API data is insufficient or the page requires interaction，use agent-browser to inspect the page。
- Do not infer specs from product category alone。

Amazon fallback：

- Expand short URLs when possible。
- Confirm title、ASIN、model number、brand、price、main image、and product facts。
- If Amazon shows multiple variants，record the selected variant and confidence。

## Image Quality

Images must be downloaded into the local content image folder。Do not use remote `image_url` for published products。

Preferred image sources：

- Official product page media。
- Store main product image at the highest available resolution。
- Manufacturer press or support image。

Quality requirements：

- Prefer at least 800px on the longest edge when available。
- Avoid thumbnails such as `US40`、`SS64`、`SX300`、`SY300`、or obvious 300px preview URLs if a larger version exists。
- Avoid watermarked、collage、text-heavy、or tiny images unless no better source exists。
- Keep the product visible with enough padding and no severe crop。
- If only low-quality images are available，report that limitation in the work summary。

Image inspection workflow：

- Prefer agent-browser to inspect image `naturalWidth` / `naturalHeight` or visible page media。
- Use store API fields、HTTP metadata、or URL pattern inspection when browser inspection is enough。
- Do not probe for or require unlisted local CLI tools for content research。Treat local PDF/OCR/image tools such as `pdftotext`、`pdfinfo`、`tesseract`、ImageMagick `magick` / `identify` as unavailable。If dimensions or PDF text cannot be verified without extra local tooling，mark them as unverified and continue。

## Browser Automation

When a research or image task needs `agent-browser`，always isolate it in a dedicated session so parallel researchers do not clobber each other。

- Pass `--session <name>` on every single `agent-browser` command。Use the content `id` as the session name（the `id` equals the JSON file stem），for example `agent-browser --session 2026-06-02-unifi-express open <url>`。
- Each `--session <name>` is an isolated browser with its own cookies、tabs、and refs。The default shared session is what makes pages and element refs collide when multiple agents run at once。
- Use the `--session <name>` flag form，not an `AGENT_BROWSER_SESSION=...` env prefix（the env-prefixed command does not match the allowed `agent-browser *` permission）。
- When finished，close only your own session with `agent-browser --session <name> close`。Never run `close --all`，which kills other researchers' sessions。

## Scope Discipline

Stay strictly within web research and single-file editing。

- Do not inspect repository or filesystem state：no `git`（status、diff、log）、`ls`、`cat`、`find`、directory listing、or build/verification commands。
- You do not need to confirm what changed or what the repo looks like——the coordinator audits and runs verification。
- Read and edit only your assigned target JSON via the read/edit tools，and use bash only for the explicitly allowed research tools（`agent-browser`、`curl`、`node`、`python`、`file`、`jq`）。

## Verification For Content-Only Tasks

Content-only tasks validate format、schema-readable content、taxonomy references、images、and generated artifacts。Do not validate the current CMS dataset by hard-coded counts or specific product IDs。

Run：

```bash
jq empty content/products/*.json content/taxonomies/*.json
pnpm build:content-images
pnpm build:public-artifacts
```

Only run Vitest when modifying schema、runtime logic、build scripts、or test logic。If an existing test fails because it hard-codes content count、specific content ID、or generated search document count，remove or refactor the bad test。Do not update expected counts to match new CMS data。

## Batch Workflow

For category/tag cleanup or multi-product enrichment，use this coordinator flow：

1. Filter target IDs first，usually by `status: "published"` plus `category_id` or `tag_ids`，and exclude already completed IDs。
2. Dispatch one subagent per product。Each subagent gets exactly one target JSON path。
3. Let each subagent update only its assigned target JSON when implementation work is requested。
4. Coordinator audits all changed JSON files，checks names are concise，checks `summary` / `long_description` were preserved，and confirms offers were not replaced。
5. Coordinator runs content verification and rebuilds public artifacts。

## Subagent Dispatch Contract

When delegating content research/update to a subagent，the prompt must explicitly tell it to use this skill and must restate the core constraints：

- Read and follow `dwselect-content-authoring`。
- One subagent handles exactly one target JSON file。
- If this is implementation work，update only the assigned target JSON file；the coordinator will audit and rebuild artifacts。If this is research-only，do not modify files。
- Do not write or rewrite `summary` and `long_description`。
- Default to `published` items when the task is about visible website content。
- Keep `name` concise：prefer 32 visible characters or fewer，hard maximum 45；put full official names in `llm_description`、aliases、or model fields。
- Provide sources、confidence、and unresolved assumptions。
- For `llm_description`，write a blog-style Markdown brief with headings、bullet points、review/user feedback when available、and verified reference links；research specs instead of paraphrasing user text。
- For images，prefer high-resolution official or store main images and report quality concerns。
- Preserve user-provided offer URL and price text unless explicitly asked to replace them。
- If offer is unavailable or unverifiable，keep it and report `offer_status` plus replacement candidates instead of changing it。
- Add official product/spec pages to `reference_url`，not by replacing the user-provided offer link。
- Raise missing brand/tag/category/channel needs as `taxonomy_suggestions`；do not edit taxonomy without user confirmation。
- For any `agent-browser` use，pass `--session <content-id>` on every command so parallel researchers do not collide，and close only that session（never `close --all`）。
- Stay within research and editing the one assigned JSON。Do not inspect repo/filesystem state（no `git`、`ls`、`cat`、`find`、build/verify）；the coordinator audits and rebuilds。

Suggested one-product implementation prompt shape：

```text
Read and follow `dwselect-content-authoring`。This is implementation work for exactly one product JSON：<path>。

Update only that JSON file。Do not modify `summary`、`long_description`、`id`、`status`、or user-provided `offers[].url` / `price_text`。Keep `name` concise（prefer <=32 visible characters，hard max 45）；put full official names in `llm_description`、`model_numbers`、or `search_aliases`。Preserve existing taxonomy IDs；if a missing brand/tag is useful，return `taxonomy_suggestions` instead of editing taxonomy。

Research official/spec/store/review sources，then update agent-owned fields：`name`、`english_name`、`model_numbers`、`search_aliases`、`reference_url`、`llm_description`，and clearly missing price currency/unit metadata when verified。If you use agent-browser，pass `--session <content-id>` on every command and close only that session。Do not run `git`、`ls`、`cat`、`find`，or build/verify commands；the coordinator audits and rebuilds。

Return：files changed、field summary、sources、confidence、offer_status、taxonomy_suggestions、unresolved assumptions。
```
