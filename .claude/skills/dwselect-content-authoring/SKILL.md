---
name: dwselect-content-authoring
description: Use ONLY when working on DW嚴選 content CMS files under content/，including product、guide、link JSON、taxonomy、content images、llm_description、price research、archive/update/add content tasks。
---

# DW嚴選 Content Authoring

Use this skill for DW嚴選 CMS content work。This project is a public static content site backed by Git JSON files。Content work means researching product data、creating or updating structured JSON、maintaining taxonomy、localizing images、and rebuilding public artifacts。

## Role

You are a researcher and structured data filler，not a personal-opinion writer。

Division of labor：the subagent does the first-draft writing。When given a target path，research the item and create or update the complete JSON file yourself（the subagent has the Write/Edit tools for exactly its one assigned file），then hand back audit notes。The coordinator's job is audit and editorial（polishing wording、confirming taxonomy、collecting finished files from worktrees、running `pnpm content:check`——not `pnpm generate`），not first-draft data entry。Only skip writing when the coordinator explicitly says research-only。

- Product `short_description` and `long_description` are user-authored personal opinions。Do not write or rewrite them unless the user explicitly provides exact text；for new products with no provided opinion，set them to empty string。
- **絕對不要把使用者的一段話拆成 `short_description` 一半、`long_description` 一半**。這兩個欄位不是「短版接長版」，是**兩個各自獨立顯示的場合**，UI 永遠只會擇一顯示其中一個：
  - `short_description` 顯示在**列表卡片**與**搜尋建議**——那裡沒有 `long_description` 可以接續，所以它必須自己就是完整的一句話。
  - `long_description` 顯示在**商品詳情頁的「DW 怎麼說」**（`product-detail.vue` 用 `long_description || short_description`，有 long 就完全不顯示 short_description），並且是搜尋索引的 description 來源。
  - 拆兩半的後果是兩邊都殘缺：卡片上看到前半句，詳情頁看到後半句，沒有任何一個畫面看得到完整內容。
- 欄位權威定義見 `docs/020-product-detail-info-architecture/spec.md`（⚠️ 該 spec 寫的是舊欄位名 `summary`，已於 sprint 043 改名為 `short_description`，語意不變）：`short_description` 是商品卡片短評／搜尋摘要／SEO fallback，`long_description` 是商品詳情頁「DW 怎麼說」主文。兩者都是使用者的個人觀點，agent 不編寫。
- 使用者提供意見文字時的正確寫法：
  1. **只給一句話** → `short_description` 放那句話的完整原文，`long_description` 留空 `""`。詳情頁的 `long_description || short_description` 會 fallback 顯示完整那句（020 spec 明訂此 fallback）。**不要為了「把欄位填滿」而把同一句複製兩份。**
  2. **給了短句 + 額外補充** → `short_description` 放短句原文；`long_description` 放能獨立讀完的完整主文，也就是「短句原文 + `\n\n` + 補充」。範例見 `content/products/2026-07-04-kinloch-anderson-traveler-20-carry-on.json`。
  3. **完全沒給意見** → 兩者都設為 `""`，並在回報中標記需要使用者補充。
- 判準：`long_description` 若非空，就必須是「單獨拿出來給讀者看也完整」的文字——詳情頁的讀者看不到 `short_description`。若你寫出來的 `long_description` 少了 `short_description` 才有的資訊，那就是拆錯了。
- 既有 95 筆商品中，92 筆的 `long_description` 是空字串、只有 3 筆有獨立主文——這是**正確**的分布，不是缺漏。sprint 006 遷移曾把同一份舊 `description` 複製進兩欄，造成 87 筆重複（020 spec 記載為「內容填充問題」），已於 sprint 044 全數清成 `""`。**不要再把 `short_description` 複製一份到 `long_description`**；沒有額外補充內容時，留空讓詳情頁 fallback 才是正解。
- Guide `title` and `short_description` are content-derived，not personal opinion：write a concise `title` and an objective 1-2 sentence `short_description` summarizing what the source post covers and its core takeaway。Do not invent opinions or use subjective recommendation words（「便宜」「好用」「剛好」）；the coordinator edits the wording afterward。
- Agent-owned fields include product name、English name、model numbers、reference links、taxonomy IDs、local image file、search aliases、and `llm_description`；for guides also `title` and the content-derived `short_description`。Offers and prices are agent-maintained only when the user has not supplied explicit offer or price text。
- `llm_description` must be objective、research-backed、and useful for search or LLM understanding。Do not paraphrase the user’s subjective recommendation text。

## Default Visibility Scope

- When the user asks to update the visible website or「網頁」，default to `status: "published"` content only。
- Do not spend research/update effort on `draft`、`unpublished`、or `archived` content unless the user or coordinator explicitly assigns those items。
- Coordinator should filter batch work by content type、status、category/tag、and completed IDs before dispatching subagents。
- New site-bound content is created publish-ready：`status: "published"` + `published_at` + a downloaded local `image_file` that passes the guard。Create a `draft` ONLY when a draft is explicitly requested——a `draft` is invisible on the public site（filtered by `isPublished`），so it delivers nothing in a go-live PR。Never downgrade to `draft` just to skip the image or empty-opinion fields；if a guard-passing local image cannot be obtained or another hard blocker appears，report it as blocked instead of committing a half-finished draft。Legitimate drafts（genuine WIP kept in the repo for a while）are fine——just make them a deliberate choice, not a fallback for incomplete work。

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
- Products must never set `image_url`；use a local `image_file` and keep `image_url: null`。This holds for every status including `draft`——the rule lives in a zod refine，so it is not visible in the JSON Schema「required」list but still fails the content gate。Published products additionally require a real `image_file`；non-published items may keep `image_file: null` but must still keep `image_url: null`。
- Do not add new categories or channels。If needed，ask the user。
- Taxonomy additions require user confirmation before editing taxonomy files。If a missing brand or tag is useful，raise it as a `taxonomy_suggestions` item with proposed ID、label、description、aliases、and rationale；do not add it silently。
- Never invent a taxonomy id。Every `category_id`、`tag_ids[]`，and `offers[].channel_id` must be copied verbatim from `jq -r '.items[].id' content/taxonomies/{categories,tags,brands,channels}.json`。An id absent from those files（e.g. a guessed `electronics`／`official`／`monitor`）fails the content gate。

### 完整必填欄位以 generated JSON Schema 為準（不要手抄）

The authoritative required-field set is generated from the zod SSOT（`app/utils/product-schema.ts`）into `content/.schema/`。Do not hand-maintain a field checklist in prose——read it directly before writing：

```bash
jq '{required, offers_required: .properties.offers.items.required}' content/.schema/product.schema.json
jq '.required' content/.schema/guide.schema.json
jq '.required' content/.schema/link.schema.json
```

Every key in the schema's `required` array must be present in the file you write。Easy-to-miss product fields that are NOT optional：`slug`、`published_at`、`unpublished_at`、`archived_at`（nullable where noted），and each offer's `checked_at`。When the zod schema changes，regenerate with `pnpm content:schema`；`tests/content-schema-artifact.test.ts` fails the gate if the committed artifact drifts from zod。

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
- If the text mainly repeats the user’s `short_description` / `long_description`，it is invalid。
- If no reviews or user feedback are found，explicitly omit that angle in the research notes；do not invent it。

Avoid：

- Repeating `short_description` or `long_description`。
- Subjective recommendation words such as「便宜」、「剛好」、「很足」、「可以考慮」、「好用」。
- Unverified claims。
- Marketing-only phrasing without specs。
- Category-specific tunnel vision。For example，do not force every product into ports／wattage／protocols；choose the dimensions that matter for that product category。

If research is weak，write a narrower description and report low confidence instead of guessing。

## Research Requirements

For product add/update work，research and return or fill：

- Store URL and price。If the user provided an offer URL or price text，treat it as primary editorial input and preserve it unless explicitly told to update it。
- Product title and model number。
- Official product page or reliable reference links。
- Key specs。
- Product image source。
- `llm_description` with confidence level。

Offer and price precedence：

- User-provided URL and price text wins over researched prices。
- User-provided purchase links belong in `offers[].url`。Do not move or replace them with official store、official spec page、or another marketplace URL。
- Official product pages、review pages、manufacturer spec pages、comparison items、or alternate source pages belong in optional `reference_links[]`（each `{ title, url }`）or the research report，not in `offers[].url`，unless the user explicitly says to change the purchase link。
- If a researched page shows a different price，return it as `observed_price` or `price_discrepancy`，not as a replacement offer。
- Do not switch channels，for example from Amazon to official store，unless the user asked to replace the offer URL or the original URL is invalid。
- If the original store page has no current offer but the user provided an approximate price，keep the approximate price and report the uncertainty。
- If the original offer URL is deleted、unavailable、or unverifiable，keep the original offer URL and price text unless explicitly told to replace them。Return `offer_status` plus possible replacement candidates for coordinator/user review。

Channel price digit obfuscation and cross-check（價格數字防呆）：

- 部分台灣通路會把價格渲染得很難 parse：momo（尤其）、Yahoo 等常把數字拆成 sprite 圖、lazy-load 節點，或用「折扣後價格」「限時折後價」「促銷價」「momo幣回饋」這類 UI 文案包住數字。直接抓 DOM text 容易抓到 UI 文案、抓錯層、或整個漏掉數字。
- 當通路頁的價格數字無法可靠讀出，或要驗證可疑數字時，改用比價聚合站交叉確認 plain-text 價格：
  - **台灣通路** → BigGo（`https://biggo.com.tw`）與 FindPrice（`https://www.findprice.com.tw`）。
  - **日本通路（日亞等）** → 價格.com（`https://kakaku.com`）。**這對日亞特別有用**：Amazon 會依 IP 把價格換成台幣（見上面的 `i18n-prefs` cookie 規則），而 kakaku.com 一律是日圓原幣別，可直接驗證你抓到的 `￥` 數字。實作細節（2026-08-11 實測）：
    ```bash
    curl -sL "https://kakaku.com/search_results/{型號}/" --max-time 30 \
      -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \
      -H 'Accept-Language: ja-JP,ja;q=0.9'
    ```
    - 價格在 `class="p-item_priceNum"` 內（純數字帶千分位）；`￥` 本身是 HTML entity `&#165;`，所以用 `[¥￥]` 抓價會全部落空，**要抓 `p-item_priceNum`**。
    - 頁面是 **EUC-JP** 編碼，直接當 UTF-8 讀會得到亂碼商品名。要比對商品名時先用 `euc-jp` decode。
    - **一定要逐項配對商品名與價格**，不要只取整頁價格的 min/max：搜尋結果會混進色帶、鑽頭、配件等低價品項，取 min 會得到毫無意義的區間（例如查 TEPRA `SR-MK1` 會混進 415 円的標籤帶）。
    - 對得上就是強佐證（實測 4 筆中 3 筆與 Amazon 完全同價）。**比 kakaku 最低價還便宜不代表抓錯**——先看 Amazon 頁面有沒有 `basisPrice` 高於售價或 deal 標記，那是 Amazon 自家折扣。
    - kakaku 只收 3C／家電。通信服務（SIM、WiFi 分享器）、防災用品、日用消耗品查不到是正常的，不要因此判定價格有問題。
  - 用商品名／型號搜尋，對到同一通路的 listing，以聚合站的純文字價格確認 `price.amount`。聚合站價格可能落後或含不同賣家，**它是合理性交叉檢查，不是取代通路頁的權威來源**——最終寫入的仍以 offer URL 當下頁面為準。
- `price.amount` 必須是已確認的數字價格。`price_text` 是前端唯一的價格顯示來源，必須乾淨且完整、可直接顯示（純數字，可帶貨幣符號、千分位，或區間「起」字尾，例如 `39,512`、`NT$39,512`、`NT$1,990 起`），不可塞入通路 UI heading 原文（如「折扣後價格」「限時折後價」）。
- `price.label`、`amount`、`currency`、`unit` 只是 metadata，前端不顯示。`label` 可選擇性記錄通路價格類型（例如「折扣價」「限時折扣」）當 metadata，但顯示完全只看 `price_text`，所以任何要顯示的修飾詞（區間「起」、幣別）都必須寫進 `price_text` 本身，不能只放在 `label`。
- 通路同時顯示多層價格（市售價／促銷價／滿件折扣價）時，記錄使用者在該 offer 實際付的可購買價格，並把分層資訊寫進研究筆記或 `price_discrepancy`，不要塞進 label。

幣別跟著通路走，**Amazon 必須強制原幣別**：

- 目標幣別：
  | `channel_id` | `price.currency` | `price_text` 範例 |
  |---|---|---|
  | `amazonjp` | `JPY` | `￥3800`、`￥42000` |
  | `amazonus` | `USD` | `$16.13`、`$105` |
  | `pchome`／`momo`／`costco` | `TWD` | `1,290`、`NT$1,990 起` |
- **⚠️ Amazon 會依你的 IP 自動把價格換成當地貨幣**。從台灣連線時，`amazon.com` 與 `amazon.co.jp` 的商品頁都會顯示 `TWD 520.39` 這種台幣換算值——照抄它就會把「當下匯率的台幣」寫進 JSON，隔天就過時，還會留下難讀的小數。
- **解法：帶 `i18n-prefs` cookie 強制原幣別**（實測有效，TWD 會完全消失）：
  ```bash
  # 美亞 → USD
  curl -sL "https://www.amazon.com/dp/{ASIN}" --max-time 30 -b 'i18n-prefs=USD' \
    -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \
    -H 'Accept-Language: en-US,en;q=0.9'
  # 日亞 → JPY：改用 -b 'i18n-prefs=JPY' 與 Accept-Language: ja-JP,ja;q=0.9
  ```
  主價格在 `id="corePrice_feature_div"` 區塊內的 `a-offscreen`。用 `agent-browser` 時同理，先確認頁面顯示的是原幣別再抄數字。
- **自我檢查**：寫入前確認 `price_text` 的幣別符號與 `channel_id` 相符。`amazonjp`／`amazonus` 的 offer 出現 `TWD` 或 `NT$` 就是抓錯了，回去帶 cookie 重抓，不要自己用匯率回推。
- **本節只約束你自己研究抓來的價格。** 使用者明確提供的 `price_text` 仍然依「Offer and price precedence」優先，即使它是台幣換算值也不要覆寫——改為回報幣別不符與你抓到的原幣別價格，交由 coordinator／使用者決定。
- 日亞既有慣例是全形 `￥` 前綴（例如 `￥3800`），美亞用 `$` 前綴。照抄頁面數字，不要自己補小數位。
- 既有資料的日亞／美亞 offer 曾有 9 筆存著台幣換算值，已於 sprint 043／044 全數修回原幣別。目前僅 `2026-06-30-corsair-ai-workstation-300` 仍是 `TWD 54,214.38`——該商品在美亞已 `Currently unavailable`、頁面無現行售價，故保留原值待決，**不是可照抄的範本**。若再看到 `channel_id` 是 `amazonjp`／`amazonus` 卻寫著 TWD／NT$ 的檔案，回報給 coordinator。

PChome fallback：

- PChome product pages may return 429。When that happens，use the PChome API first：`https://ecapi.pchome.com.tw/ecshop/prodapi/v2/prod/{PRODUCT_ID}&fields=Id,Name,Nick,Price,Pic,Slogan,Describe,Spec&_callback=jsonp`
- If API data is insufficient or the page requires interaction，use agent-browser to inspect the page。
- Do not infer specs from product category alone。

Amazon fallback（工具選擇是實測結論，不是偏好；2026-08 以 ASIN `B0CRT9VTGM` 驗證）：
- **⚠️ 把抓下來的 HTML 存檔時，檔名一定要帶 content id。** Coordinator 常同時派多個 researcher，大家共用同一個 scratchpad 目錄；用 `amzn.html`、`page.html` 這種通用檔名會被其他 researcher 覆寫，於是你 parse 到的是別的商品頁面——2026-08-11 一次 8 個並行 researcher 就真的發生過，有 agent 讀到了另外兩個無關商品。正確寫法：`curl ... -o "scratchpad/{content-id}.html"`。**parse 完務必核對頁面的 `id="productTitle"` 與你負責的商品是否相符**，這是最後一道防線。

- **不要用 WebFetch 抓 Amazon**——它一律回 HTTP 500／503「Service Unavailable」／「Continue shopping」反自動化中間頁（約 2KB，無商品內容）。這是工具問題，不是站台封鎖；遇到時換工具，不要回報成「Amazon 被反自動化攔截、無法取得」。
- 商品事實（title、ASIN、型號、品牌、價格、主圖、product facts）用帶瀏覽器 header 的 `curl`。**缺 `User-Agent` 就會拿到中間頁，補齊三個 header 就回完整 1.5MB+ 商品頁**：
  ```bash
  curl -sL "https://www.amazon.co.jp/dp/{ASIN}" --max-time 30 \
    -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \
    -H 'Accept-Language: ja-JP,ja;q=0.9,en;q=0.8' \
    -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  ```
  判斷有沒有被擋：回應 < 10KB 或不含 `id="productTitle"` 就是中間頁——先檢查 header 是否帶齊，不要直接放棄。
- `agent-browser` 開 Amazon 商品頁不會被攔（實測全新 session 直接 200，`.co.jp` 與 `.com` 皆是）。不需要「先開首頁暖 cookie」這類儀式。萬一真的落在「Continue shopping」頁，點該按鈕續行即可，不是終局阻塞。
- Expand short URLs when possible。
- If Amazon shows multiple variants，record the selected variant and confidence。

Review/user feedback research：

- If a page shows a rating、review count、「評論摘要」or review tab，do not stop at the aggregate score。Try to obtain readable individual review text before writing that reviews are unavailable。
- Minimum effort before claiming individual reviews cannot be obtained：open the page with `agent-browser` in the dedicated content-id session；wait for dynamic content；scroll to or click the review section/tab；click「顯示更多」、「更多評論」、pagination、sort/filter controls when present；extract text from the review container；inspect network requests for review providers or review APIs；check embedded page state、JSON-LD、script data、and provider widgets when the DOM is sparse。
- Common review providers and signals to inspect include Bazaarvoice、Trustvoice、Yotpo、Judge.me、PowerReviews、native store review endpoints、Amazon 商品頁 review cards（見下方 Amazon 專段）、Costco/Samsung/Electrolux review widgets、and PChome/Yahoo/momo review blocks or APIs。

Amazon 個別評論（實測路徑，不要自己重新摸索）：

- **個別評論在商品頁本身，不在 `/product-reviews/`**。`/product-reviews/{ASIN}` 未登入時 302 轉到 `/ap/signin` 硬登入牆——這既不是逾時也不是反自動化，重試與換 header 都不會過。試一次確認後就停手，不要記成「請求逾時」。
- 正確做法：用 `agent-browser` 開**商品頁**，評論卡是 client-side render（`curl` 抓不到，靜態 HTML 裡只有 CSS class 名稱），selector 是 `[data-hook="review"]`：
  ```bash
  agent-browser --session {content-id} open "https://www.amazon.com/dp/{ASIN}"
  agent-browser --session {content-id} eval "(() => [...document.querySelectorAll('[data-hook=review]')].map(r => r.innerText.replace(/\s+/g,' ')).join('\n---\n'))()"
  ```
- **`[data-hook="review-body"]` 已失效**（新版 review card 不再使用）。它命中 0 不代表沒有評論——一律改用 `[data-hook="review"]` 再判斷。
- 不同區域站的評論卡數量不同（實測同一 ASIN：amazon.com 13 則、amazon.co.jp 5 則）。樣本太少時換另一個區域站再取一次，並在摘要標明取自哪一站。
- 評論卡會標示發表國別（「在加拿大發布評論」），屬全球評論池；摘要時標註國別分布與樣本數，不要講成該站在地評價。
- UI chrome 會依 `Accept-Language` 被翻譯（出現「將評論翻譯成中文」「舉報」等按鈕文字），評論本文仍是原文。不要把這些 chrome 文字或翻譯按鈕當成評論內容寫進摘要。
- 只有在商品頁 `[data-hook="review"]` 也命中 0 時，才能寫「個別評論不可得」，且必須寫明已試過商品頁 review cards——不可用 `/product-reviews/` 的登入牆當作整體不可得的理由。
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
- `tests/published-products` + `tests/product-schema.test.ts`：zod schema validation against every published item (required fields、`offers` min length、`image_file` required for published、`image_url: null` for products，timestamp format)。
- `tests/content-taxonomy-references.test.ts`：every `category_id` / `tag_ids` (including brand IDs) resolves to an existing taxonomy entry。This is why new brand/tag taxonomy entries must be added before the check passes。
- `tests/assert-content-images.test.ts`：every published `image_file` exists and passes the guard (shortest side >= 480px，aspect ratio <= 2:1)。
- `tests/content-schema-artifact.test.ts`：the committed `content/.schema/*.json` still matches `z.toJSONSchema` of the zod SSOT (drift-guard；regenerate with `pnpm content:schema`)。

**`pnpm generate` is not part of the content gate。** The dev server already has content HMR，so adding or editing content JSON reflects live without a generate step，and `pnpm content:check` is the data gate。Only run `pnpm generate` when you have an explicit reason the lightweight check cannot cover（e.g. verifying SSG route output、a build-script change），and state that reason first。Caveat when you do：a host `pnpm generate` collides with the running dev container on the shared `.nuxt` / Vite cache（see project memory `feedback_no-host-generate-with-dev-container`），so stop the dev container or run it in an isolated worktree first——never the mv-the-blocker-aside dance just to make a full build pass。

After the check passes，confirm the live page actually renders via the running dev server (open `https://${APP_URL}/products/<id>` and verify title、image、price、pills)，per the project Frontend Handoff rule——the check validates data，not the rendered page。

If an existing test fails because it hard-codes content count、specific content ID、or generated search document count，remove or refactor the bad test。Do not update expected counts to match new CMS data。Run additional Vitest suites only when modifying schema、runtime logic、build scripts、or test logic。

## Dispatch In Isolated Worktrees

Every implementation subagent runs in its own git worktree，never directly on the live `content/` tree。Dispatch with `Agent({ isolation: "worktree" })`。

Why：multiple researchers running in parallel——or a separate human session editing `content/` at the same time——must not see each other's half-written files。A product JSON saved mid-write into the live `content/` makes the dev server's content HMR and any concurrent `pnpm vitest` / schema check fail zod on an incomplete file。Isolating each subagent's writes means the live tree only ever receives a complete，audited file。

Collection after a subagent returns：

1. The subagent writes its one target file (and downloads its image) relative to its worktree cwd，exactly as normal——it does not need to know it is in a worktree。It reports the path it wrote。
2. The coordinator reads that file from the worktree，does the editorial audit，then copies the finished JSON (and any new image under `content/.../images/`) into the main working tree。Find worktrees with `git worktree list`；the Claude Code convention places them under `.claude/worktree/*`。
3. Only the coordinator's copy into the main tree makes the content live。Do not point the dev server or the check at a worktree。
4. Taxonomy edits (`content/taxonomies/*.json`) are made by the coordinator in the main tree，never inside a per-item worktree——taxonomy is shared state and would conflict across parallel worktrees。

## Batch Workflow

For category/tag cleanup or multi-product enrichment，use this coordinator flow：

1. Filter target IDs first，usually by `status: "published"` plus `category_id` or `tag_ids`，and exclude already completed IDs。
2. Dispatch one subagent per product in its own worktree（`Agent({ isolation: "worktree" })`）。Each subagent gets exactly one target JSON path。
3. Let each subagent create or update its assigned target JSON file itself when implementation work is requested（the subagent writes the file；the coordinator does not type the data in）。
4. As each subagent returns，collect its finished file (and image) from the worktree into the main tree (see Dispatch In Isolated Worktrees)，then audit it (editorial pass)：checks names are concise，checks product `short_description` / `long_description` were preserved，checks guide `title` / `short_description` read well and stay objective，confirms taxonomy IDs exist，and confirms offers were not replaced。
5. Coordinator adds any confirmed new taxonomy entries in the main tree，runs `pnpm content:check`（not `pnpm generate`），then confirms the live page renders。

## Subagent Dispatch Contract

When delegating content research/update to a subagent，the prompt must explicitly tell it to use this skill and must restate the core constraints：

- Read and follow `dwselect-content-authoring`。
- One subagent handles exactly one target JSON file。
- If this is implementation work，create or update the assigned target JSON file yourself；write a complete schema-valid file（`id` matching the file stem，required fields，ISO 8601 `+08:00` timestamps，`status: "published"` + `published_at` for new published content）。The coordinator collects the finished file from your worktree，audits、does editorial，and runs the content check (no `pnpm generate`)。If this is research-only，do not modify files。
- For products，do not write or rewrite `short_description` and `long_description`（empty string when no user opinion）。For guides，write a content-derived `title` and an objective 1-2 sentence `short_description`。
- Default to `published` items when the task is about visible website content。
- Keep `name` concise：prefer 32 visible characters or fewer，hard maximum 45；put full official names in `llm_description`、aliases、or model fields。
- Provide sources、confidence、and unresolved assumptions。
- For `llm_description`，write a blog-style Markdown brief with headings、bullet points、review/user feedback when available、and verified reference links；research specs instead of paraphrasing user text。
- For review/user feedback，do not give up after static fetch。If rating/count or a review widget exists，use the review research workflow：agent-browser dynamic page、review tab/scroll/show-more interactions、DOM text extraction、network/API inspection、and precise blocker reporting before claiming individual reviews are unavailable。
- For images，prefer contextual/lifestyle or in-use official/store images over isolated product-only renders；the chosen image must pass the guard（shortest side >= 480px，aspect ratio <= 2:1）and the subagent must report dimensions and source type。
- Preserve user-provided offer URL and price text unless explicitly asked to replace them。
- If offer is unavailable or unverifiable，keep it and report `offer_status` plus replacement candidates instead of changing it。
- Add official product/spec pages to optional `reference_links[]`，not by replacing the user-provided offer link。
- Raise missing brand/tag/category/channel needs as `taxonomy_suggestions`；do not edit taxonomy without user confirmation。
- For any `agent-browser` use，pass `--session <content-id>` on every command so parallel researchers do not collide，and close only that session（never `close --all`）。
- Stay within research and writing/editing the one assigned JSON file。Do not inspect repo/filesystem state（no `git`、`ls`、`cat`、`find`、build/verify，and never `pnpm generate`）；the coordinator collects from your worktree，audits、does editorial，and runs the content check。

Suggested one-product implementation prompt shape：

```text
Read and follow `dwselect-content-authoring`。This is implementation work for exactly one content JSON：<path>。

Create or update that JSON file yourself（write the complete schema-valid file）。Do not modify `short_description`、`long_description`、`id`、`status`、or user-provided `offers[].url` / `price_text`。Keep `name` concise（prefer <=32 visible characters，hard max 45）；put full official names in `llm_description`、`model_numbers`、or `search_aliases`。Preserve existing taxonomy IDs；if a missing brand/tag is useful，return `taxonomy_suggestions` instead of editing taxonomy。

Research official/spec/store/review sources，then write agent-owned fields：`name`、`english_name`、`model_numbers`、`search_aliases`、`reference_links`、`llm_description`，and clearly missing price currency/unit metadata when verified。For a guide，also write a content-derived `title` and an objective 1-2 sentence `short_description`，and keep `source_url` as the post URL。For reviews，if rating/count or a review widget exists，use agent-browser dynamic inspection、review interactions、DOM extraction、and network/API inspection before claiming individual review text is unavailable。If you use agent-browser，pass `--session <content-id>` on every command and close only that session。Do not run `git`、`ls`、`cat`、`find`、build/verify，or `pnpm generate`；the coordinator collects from your worktree，audits、does editorial，and runs the content check。

Return：files changed、field summary、sources、confidence、offer_status、image source type、image dimensions、taxonomy_suggestions、unresolved assumptions。
```
