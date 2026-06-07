# Handoff: DW嚴選 導購站重新設計 — C 路線「俐落清單」

## Overview
This is a redesign of **DW嚴選** (applepig.idv.tw/dwselect), a personal product-recommendation / 推坑 site: a curated list of products the owner ("DW") personally recommends, each with a one-line opinionated review, a price, a sales channel, and hashtags. Tapping a product opens a detail view with a "buy" link that goes out to the retailer (PChome / momo / Amazon JP / 蝦皮 / 官網).

This package documents **Direction C「俐落清單」(Compact App)** — the chosen direction — across **phone / iPad / desktop**, with a **light/dark toggle**. It keeps the existing brand feel (warm dark UI, orange accent, playful 有梗 Traditional-Chinese voice).

## About the Design Files
The files in this bundle are **design references built in HTML/React (inline JSX prototypes)** — they show the intended look, layout, and behavior. They are **not production code to copy**.

The target codebase is **Nuxt 3 + Nuxt UI + Tailwind**. The task is to **recreate these designs as Vue SFCs using Nuxt UI components and the project's existing patterns** — map the tokens below onto your Tailwind/Nuxt UI theme, use `useColorMode()` for light/dark, and use Nuxt UI primitives (`UButton`, `UInput`, `UBadge`, `UCard`, `UModal`, `UNavigationMenu`, etc.) rather than porting the inline styles verbatim.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interactions are specified below. Recreate the UI faithfully, but express it through Nuxt UI components + Tailwind utilities. Pixel values are the design intent; translate them to your spacing scale where it makes sense.

---

## Design Tokens

### Fonts
- **Display / headings:** `Noto Serif TC`, weights 700–900 (logo, section titles, product detail H2, the "DW 怎麼說" review body).
- **Body / UI:** `Noto Sans TC`, weights 400–900 (everything else).
- Load via `@nuxtjs/google-fonts` or self-host. Set as Tailwind `fontFamily.serif` / `fontFamily.sans`.

### Color tokens (two themes — wire to `useColorMode`)
| Token | Role | Dark | Light |
|---|---|---|---|
| `bg` | page background | `#16140e` | `#f7f1e7` |
| `bg2` | raised surface / inputs | `#1e1b13` | `#fffdf8` |
| `card` | card / list-row surface | `#23201a` | `#ffffff` |
| `line` | hairline borders | `rgba(255,255,255,0.09)` | `rgba(45,32,15,0.12)` |
| `ink` | primary text | `#f6efe3` | `#2a2017` |
| `sub` | secondary text | `rgba(246,239,227,0.56)` | `rgba(42,32,23,0.58)` |
| `faint` | tertiary text / inactive icons | `rgba(246,239,227,0.34)` | `rgba(42,32,23,0.42)` |
| `orange` | **brand primary** (active, price, CTA) | `#ff8a3d` | `#ec7a2b` |
| `orangeDeep` | tag text / pressed | `#f0922e` | `#dd6915` |
| `peach` | CTA gradient top, hero price | `#f9c193` | `#f4a559` |
| `tile` | product image placeholder | `linear-gradient(150deg,#fbf7f1,#f0e7da)` | `linear-gradient(150deg,#f4efe5,#e8dece)` |
| `tileInk` | placeholder icon color | `#b9a98f` | `#bfae93` |
| `glass` | sticky bars (with `backdrop-blur`) | `rgba(22,20,14,0.86)` | `rgba(250,245,237,0.84)` |
| `chipBg` | inactive chip background | `#221e16` | `#efe7d9` |
| `scrim` | modal backdrop | `rgba(8,7,4,0.62)` | `rgba(60,44,24,0.34)` |
| `railBg` | side nav background | `#1a1810` | `#fbf6ee` |

**Nuxt UI tip:** set `primary` to an orange scale matching `#ec7a2b`/`#ff8a3d` (e.g. a custom color in `app.config.ts` → `ui.primary`). The two table columns map cleanly to Nuxt UI's `dark:` variants; consider defining CSS variables (`--dw-bg`, `--dw-ink`, …) on `:root` and `.dark` so components stay theme-agnostic.

### Typography scale (px → intent)
| Use | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Logo `DW嚴選` | serif | 21 (mobile) / 23 (desktop) | 900 | `嚴選` is `orange`, `DW` is `ink` |
| Section title (首頁/選購指南/搜尋/連結) | serif | 22–26 | 800 | letter-spacing .5 |
| Product name (card) | sans | 14.5 | 700 | 1 line, ellipsis |
| Product review (card) | sans | 12.5 | 400 | `sub`, clamp 2 lines, line-height 1.5 |
| Price chip (on image) | sans | 13 | 800 | bg `orange`, text `#231405`, pill |
| Channel badge (on image) | sans | 11 | 700 | dark glass pill, white text, 5px dot in channel tint |
| Detail title | serif | 27 | 700 | |
| Detail price | sans | 26 | 800 | `orange` |
| "DW 怎麼說" label | sans | 11 | 800 | letter-spacing 1.5, `orange` |
| "DW 怎麼說" body | serif | 18 | 500 | line-height 1.6, `text-wrap: pretty` |
| Tag pill | sans | 13 | 600–700 | `#tag` |
| Buy button | sans | 17 | 800 | |
| Nav label | sans | 10.5 (mobile/tablet) / 15 (desktop) | 600–800 | |

### Radius / spacing / shadow
- **Radii:** image tile 14; cards & list rows 16; category chips 10; nav items 12; tag/channel/price pills 9999; detail modal 26; buy button 16.
- **Grid gaps:** mobile `20px / 16px` (row/col); desktop `28px / 22px`.
- **Content padding:** phone 18; tablet 28; desktop 40.
- **Modal shadow:** dark `0 24px 60px rgba(0,0,0,0.5)`; light `0 24px 60px rgba(80,55,20,0.16)`.
- **CTA shadow:** `0 8px 22px rgba(236,122,43,0.30)`.

---

## Data model
Each product (see `dw-data.js`):
```ts
interface Product {
  id: string
  name: string            // "Sharp 65吋 XLED"
  price: number           // 43000
  priceLabel?: string     // overrides display, e.g. "低於 60000"
  cat: 'av'|'home'|'kitchen'|'3c'|'life'
  icon: string            // placeholder glyph key (tv, speaker, sofa, pot, …)
  channel: 'pchome'|'momo'|'amazonjp'|'shopee'|'official'
  hot?: boolean           // shows "嚴選熱推" flame badge
  tags: string[]          // ['電視','影音','4K']
  review: string          // DW's one-liner — the heart of the site
}
```
- **Categories (`cats`):** 影音 `av` · 居家 `home` · 廚房 `kitchen` · 3C `3c` · 生活 `life`.
- **Channels:** each has a `name` + brand `tint` (PChome `#e6332a`, momo `#e4007f`, Amazon JP `#ff9900`, 蝦皮 `#ee4d2d`, 官網 `#6b8f4e`) used only as a small dot.
- **`tags`** is derived: all tags ranked by frequency, used to size the explore chips.
- Price display: `priceLabel ?? 'NT$ ' + price.toLocaleString()`. On image cards it's compacted to `$43,000`.
- **The placeholder image tiles are intentional** — real product photos (white-background retailer shots) should drop straight into the tile area. Keep the tile as the image container.

---

## Screens / Views

The app is **one screen with 4 tabs**; navigation chrome changes by breakpoint but content panels are identical.

### Navigation (4 destinations — same everywhere)
`首頁 home` · `指南 guide` · `搜尋 search` · `連結 link`
- **Phone (<768px):** sticky **bottom tab bar** (icon + label, active = `orange`). Sticky top header = logo left + theme toggle right.
- **Tablet (768–1199px):** **left rail ~96px** (logo top, vertical icon+label nav). Main column has a sticky top bar = section title left + toggle right. Grid = 3 cols.
- **Desktop (≥1200px):** **left sidebar ~232px** (logo + horizontal icon+label rows, active row has `rgba(236,122,43,0.14)` bg). Sticky top bar = section title + toggle. Grid = 4 cols.
- Nuxt UI: `UNavigationMenu` (v3) / `UVerticalNavigation` (v2) for rail/sidebar; bottom bar is a small custom component. Icons are simple 24px line icons (`UIcon`, e.g. heroicons: `home`, `compass`/`map`, `magnifying-glass`, `link`).

### Panel: 首頁 (Home)
- **Category chips row** (horizontal scroll): `全部` + 5 categories. Active chip = `orange` bg / `#231405` text; inactive = `chipBg` / `sub`. Radius 10.
- **Product grid** (2/3/4 cols). Each **product card**:
  - Image tile (`tile` bg, aspect 1:1, radius 14, 1px `line` border) with the placeholder glyph centered.
  - **Channel badge** overlaid top-left: dark glass pill (`rgba(20,18,12,0.62)` + blur), white text, channel-tint dot.
  - **Price chip** overlaid bottom-right: `orange` pill, `$43,000`.
  - Below the tile: product **name** (1 line) + **review** (2-line clamp, `sub`).
  - Whole card is a button → opens detail. (`UCard` or custom button.)

### Panel: 指南 (Guide)
- Intro line: "跟著標籤逛 — 選幾個標籤，越疊越精準" + a 清除 N link when tags are selected.
- **Tag chips** (wrap): every tag with its count. Toggle = multi-select; selected = `orange` filled, unselected = transparent w/ `1px rgba(236,122,43,0.32)` border, `orangeDeep` text.
- Filtering is **AND** (a product must contain *all* selected tags). Grid below updates live.
- (Currently a tag filter. The owner may later want real buying-guide articles here — leave the tab extensible.)

### Panel: 搜尋 (Search)
- A search `UInput` (icon left, clear "x" when filled), placeholder **`在找什麼嗎？™`** (keep the ™ — it's part of the brand voice).
- Empty state: "熱門關鍵字" + tappable keyword pills (top ~8 tags) that fill the query.
- Results: "找到 N 個" + grid. No results → playful empty state: "沒這個坑，去許願吧 👀".
- Match against `name`, `tags`, and `review` (substring).

### Panel: 連結 (Link)
- Short intro paragraph (brand voice).
- A list of **link rows** (card surface, 1px `line`, radius 16): icon tile (44px, `rgba(236,122,43,0.14)` bg, `orange` icon) + title + subtitle + chevron. Rows:
  1. 推坑串 · 許願去 — "看大家在敲什麼，順便許願"
  2. DW 的 FB 粉專 — "追蹤每週嚴選更新"
  3. 分類總覽 — "影音 · 居家 · 廚房 · 3C · 生活"
- These are external links (the original site links to a Facebook 推坑串 post).

### Detail view (product)
Triggered by tapping any card.
- **Phone:** full-screen **sheet** sliding over the app (`UModal` fullscreen or a dedicated route).
- **Tablet / Desktop:** centered **modal** (`min(540px, 94%)`, max-height 90%, radius 26, `scrim` backdrop + blur; click backdrop or X to close). Use `UModal`.
- Contents (top → bottom):
  1. **Hero**: the product image tile (280–320 tall). `嚴選熱推` flame badge top-left if `hot`. Close "X" button top-right (dark glass circle).
  2. Channel badge (dot + name).
  3. **Title** (serif 27) + **price** (sans 26, `orange`).
  4. **"DW 怎麼說" callout**: `bg2` surface, 1px `line`, radius 16, a 3px `orange` left accent bar; label (uppercase-ish, letter-spacing) + the `review` in serif 18. This is the most important element — it's the personality of the site.
  5. **Tag pills** (`#電視` …), `orangeDeep` on `rgba(236,122,43,0.12)` w/ matching border.
  6. **Buy button**: full-width, 54px, radius 16, gradient `linear-gradient(180deg, peach, orange)`, text `#2a1605`, label "到 {channel} 購買", link icon. Goes out to the retailer.
  7. Fine print: "外連到通路，DW 不經手金流，安心逛".

---

## Interactions & Behavior
- **Card → detail** uses the **View Transition API** to morph the tapped image tile into the detail hero. Implementation: give the tapped tile and the detail hero the **same unique** `view-transition-name` right before the state change, wrap the open/close in `document.startViewTransition()`, and clear the name afterward (a name must be unique per snapshot — only the source carries it while closed, only the hero while open). In Nuxt 3 you can also enable route-level transitions via `experimental.viewTransition: true`, but the card→sheet morph is a same-document transition.
- Transition timing used: group `0.44s cubic-bezier(.45,0,.15,1)`; root crossfade `0.26s`. Respect `prefers-reduced-motion`.
- **Theme toggle** (top-right, sun/moon): flips `useColorMode().preference` between `light`/`dark`. All tokens swap. (In the prototype each device demos a different default; in production, persist the user's choice — Nuxt UI/color-mode does this by default.)
- **Category chips / tag chips / search** all filter live, no page reload.
- **Tabs** swap the content panel; selection state is local.
- Sticky top bar and bottom/side nav use `backdrop-blur` over the `glass` token.
- Hit targets ≥44px on touch.

## State Management
Local component state (or a `useState`/Pinia store if shared):
- `colorMode` — light/dark (via `useColorMode`).
- `activeTab` — `'home' | 'guide' | 'search' | 'link'`.
- `activeCategory` — `'all' | catId` (Home).
- `selectedTags: string[]` (Guide, AND filter).
- `searchQuery: string`.
- `openProduct: Product | null` (detail).
- Derived: `homeItems`, `guideItems`, `searchItems`.
- Product data is static JSON today (`dw-data.js`); swap for your CMS/API fetch (`useFetch`/`useAsyncData`). Shape is in the Data model section.

## Responsive behavior
- Breakpoints (suggested): phone `<768`, tablet `768–1199`, desktop `≥1200`.
- Grid columns 2 / 3 / 4. Nav: bottom bar / left rail 96 / left sidebar 232. Detail: sheet / modal / modal.
- Use Tailwind responsive variants; the panels (chips, grid, search, links) are shared and just reflow.

## Assets
- **No external image assets** in the prototype — product images are CSS placeholder tiles with line-icon glyphs. Replace with real retailer product photos (white-background) dropped into the tile container. Keep aspect 1:1 on cards.
- **Icons:** simple 24px line icons — use your existing icon set (`UIcon` + heroicons/lucide). Glyph keys in the data (`tv`, `speaker`, `soundbar`, `table`, `drawer`, `sofa`, `pot`, `coffee`, `airfryer`, `keyboard`, `monitor`, `headphones`, `lamp`) are just placeholders for "what kind of product" — not needed once real photos exist.
- **Fonts:** Noto Serif TC + Noto Sans TC (Google Fonts).

## Files in this bundle (design references)
- `DW嚴選 — 俐落清單.html` — the C-route prototype: phone + iPad + desktop, with the light/dark toggle. **Open this in a browser to see the intended behavior.**
- `dw-dir-c2.jsx` — the responsive C app (nav per breakpoint, panels, theme provider). Read for layout logic, not to copy.
- `dw-shared.jsx` — tokens, both theme objects, the product card / channel badge / price / detail panel, and the View-Transition helper. **The token values and the detail-panel structure are the most useful reference here.**
- `dw-data.js` — the full product/category/channel data model and sample content (real copy in DW's voice).
- `DW嚴選 Redesign.html` (optional) — the earlier 3-direction comparison (A 雜誌精選 / B 標籤探索 / C 俐落清單) for context on why C was chosen.

A developer who wasn't in the original conversation should be able to build this from this README alone.
