import { expect, test } from '@playwright/test'

const SEARCH_RESULT_TIMEOUT_MS = 15_000

function getNavRoot(page, project_name) {
  if (project_name === 'phone') {
    return page.locator('.compact-app-bottom-tabs')
  }

  if (project_name === 'tablet') {
    return page.locator('.compact-app-rail')
  }

  return page.locator('.compact-app-sidebar')
}

function getBreadcrumbTextPattern(label) {
  return new RegExp(`^DW嚴選\\s*>\\s*${label}$`)
}

async function getFirstProductHref(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_card = page.locator('.product-card-link').first()
  await expect(first_card).toBeVisible()
  await expect(first_card).toHaveAttribute('href', /\/products\/.+/)

  const href = await first_card.getAttribute('href')
  if (href === null) {
    throw new Error('Expected first product card to have an href')
  }

  expect(href).toMatch(/\/products\/.+/)

  return href
}

async function openFirstProductDetail(page) {
  const href = await getFirstProductHref(page)

  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const detail = page.locator('.product-detail-page')
  await expect(detail).toBeVisible()

  return detail
}

test('renders the compact app shell and responsive navigation', async ({ page }, test_info) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page).toHaveTitle('DW嚴選｜值得買、值得看、值得收藏的選物清單')
  await expect(page.getByRole('heading', { name: 'DW嚴選' })).toBeVisible()
  await expect(page.locator('.compact-top-bar .breadcrumb-link')).toHaveAttribute('href', '/')
  await expect(page.getByRole('heading', { name: '首頁' })).toHaveCount(0)

  if (test_info.project.name === 'phone') {
    await expect(page.locator('.compact-app-bottom-tabs')).toBeVisible()
    await expect(page.locator('.compact-app-rail')).toBeHidden()
    await expect(page.locator('.compact-app-sidebar')).toBeHidden()
  }

  if (test_info.project.name === 'tablet') {
    await expect(page.locator('.compact-app-rail')).toBeVisible()
    await expect(page.locator('.compact-app-bottom-tabs')).toBeHidden()
    await expect(page.locator('.compact-app-sidebar')).toBeHidden()
  }

  if (test_info.project.name === 'desktop') {
    await expect(page.locator('.compact-app-sidebar')).toBeVisible()
    await expect(page.locator('.compact-app-bottom-tabs')).toBeHidden()
    await expect(page.locator('.compact-app-rail')).toBeHidden()
  }
})

test('renders category breadcrumb and aligns the desktop product grid with header copy', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'desktop breadcrumb and alignment check only runs on desktop')

  await page.goto('/?category=computer-3c', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('電腦3C'))

  const alignment = await page.evaluate(() => {
    const header_title = document.querySelector('.compact-top-bar .top-bar-title')?.getBoundingClientRect()
    const product_grid = document.querySelector('.product-grid')?.getBoundingClientRect()

    return {
      left_delta: Math.abs((header_title?.left ?? 0) - (product_grid?.left ?? 0)),
      grid_width: product_grid?.width ?? 0,
    }
  })

  expect(alignment.left_delta).toBeLessThanOrEqual(1)
  expect(alignment.grid_width).toBeGreaterThan(0)

  await page.goto('/?category=not-a-real-category', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText('DW嚴選')
})

test('keeps sparse category product cards at tablet three-column width', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'tablet', 'tablet grid width check only runs on tablet')

  await page.goto('/?category=network', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('網路通訊'))

  // The home grid runs a Vue Transition (mode="out-in"): on load it briefly shows the
  // previous "all" state (71 cards) then leave/enter-swaps to the network state. Measuring
  // mid-transition can catch a freshly-mounted grid before layout settles (column_count=1).
  // Settle signal: the active category chip's count is the source of truth for how many cards
  // should render (UI-derived, not hardcoded), and the transition must have no -active classes.
  await page.waitForFunction(() => {
    const grid = document.querySelector('.product-grid')
    const results = document.querySelector('.home-results')

    if (grid === null || results === null) {
      return false
    }

    if (results.className.includes('-active')) {
      return false
    }

    const pressed_count = document.querySelector('.category-chip[aria-pressed="true"] .chip-count')
    const expected_card_count = pressed_count === null ? null : Number(pressed_count.textContent)

    if (expected_card_count === null || Number.isNaN(expected_card_count)) {
      return false
    }

    return grid.querySelectorAll('.product-card').length === expected_card_count
  }, { timeout: 10_000 })

  const grid_metrics = await page.locator('.product-grid').evaluate((grid) => {
    const style = window.getComputedStyle(grid)
    const columns = style.gridTemplateColumns.split(' ').map((column) => Number.parseFloat(column))
    const cards = Array.from(grid.querySelectorAll('.product-card')).map((card) => card.getBoundingClientRect().width)

    return {
      column_count: columns.length,
      first_column_width: columns[0] ?? 0,
      first_card_width: cards[0] ?? 0,
      grid_width: grid.getBoundingClientRect().width,
      product_count: cards.length,
    }
  })

  // product_count is intentionally not pinned—the test verifies the layout contract
  // (cards fit columns and don't stretch to full width) regardless of how many items exist
  expect(grid_metrics.product_count).toBeGreaterThanOrEqual(1)
  expect(grid_metrics.column_count).toBe(3)
  expect(grid_metrics.first_card_width).toBeCloseTo(grid_metrics.first_column_width, 0)
  expect(grid_metrics.first_card_width).toBeLessThan(grid_metrics.grid_width / 2)
})

test('switches home categories with a category-keyed result transition contract', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'desktop category transition check only runs on desktop')

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText('DW嚴選')

  const transition_contract = await page.evaluate(() => {
    const element = document.createElement('div')
    element.className = 'home-results-enter-active'
    document.body.append(element)
    const style = window.getComputedStyle(element)
    const contract = {
      transition_duration: style.transitionDuration,
      transition_property: style.transitionProperty,
    }

    element.remove()

    return contract
  })
  expect(transition_contract.transition_duration).not.toBe('0s')
  expect(transition_contract.transition_property).toContain('opacity')

  await page.locator('.compact-app-sidebar').getByRole('link', { name: /電腦3C/ }).click()
  await expect(page).toHaveURL('/?category=computer-3c')
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('電腦3C'))
})

test('keeps the mobile header lightweight without card chrome', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'phone', 'mobile header chrome check only runs on phone')

  await page.goto('/?category=network', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('網路通訊'))

  const header_chrome = await page.locator('.compact-top-bar').evaluate((header) => {
    const style = window.getComputedStyle(header)

    return {
      border_top_width: style.borderTopWidth,
      box_shadow: style.boxShadow,
      margin_left: style.marginLeft,
      margin_right: style.marginRight,
    }
  })

  expect(header_chrome.border_top_width).toBe('0px')
  expect(header_chrome.box_shadow).toBe('none')
  expect(header_chrome.margin_left).toBe('0px')
  expect(header_chrome.margin_right).toBe('0px')
})

test('does not expose horizontal document overflow across responsive viewports', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const overflow_metrics = await page.evaluate(() => {
    const document_element = document.documentElement
    const body = document.body

    return {
      document_client_width: document_element.clientWidth,
      document_scroll_width: document_element.scrollWidth,
      body_client_width: body.clientWidth,
      body_scroll_width: body.scrollWidth,
    }
  })

  expect(overflow_metrics.document_scroll_width).toBeLessThanOrEqual(overflow_metrics.document_client_width)
  expect(overflow_metrics.body_scroll_width).toBeLessThanOrEqual(overflow_metrics.body_client_width)
})

test('switches tabs without navigation reload and exposes search and link contracts', async ({ page }, test_info) => {
  const nav_root = getNavRoot(page, test_info.project.name)

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page.getByRole('heading', { name: '首頁' })).toHaveCount(0)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText('DW嚴選')
  await expect(page.locator('.compact-top-bar .breadcrumb-link')).toHaveAttribute('href', '/')

  await nav_root.getByRole('link', { name: '指南' }).click()
  await expect(page).toHaveURL('/guide')
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('指南'))
  await expect(page.getByRole('heading', { name: '指南列表' })).toHaveCount(0)

  await nav_root.getByRole('link', { name: '搜尋' }).click()
  await expect(page).toHaveURL('/search')
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('搜尋'))
  await expect(page.getByRole('heading', { name: '搜看看' })).toHaveCount(0)
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toBeVisible()

  await nav_root.getByRole('link', { name: '連結' }).click()
  await expect(page).toHaveURL('/links')
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('連結'))
  await expect(page.getByRole('heading', { name: '相關入口' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /applepig\.idv\.tw/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /applepig\.idv\.tw/ })).toHaveAttribute('href', 'https://applepig.idv.tw')

  await page.goBack()
  await expect(page).toHaveURL('/search')
})

test('renders guide and links with the shared resource row contract', async ({ page }) => {
  await page.goto('/guide', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const guide_list = page.locator('.resource-list')
  const guide_row = guide_list.locator('.resource-row').first()
  await expect(guide_list).toBeVisible()
  await expect(guide_row.locator('.resource-row-media')).toBeVisible()
  // Guide rows show an img when the guide has a cover image, or a fallback icon when it doesn't.
  // Either is a valid media slot; the contract is that one of them is present.
  await expect(
    guide_row.locator('.resource-row-media img')
      .or(guide_row.locator('.resource-row-fallback-icon')),
  ).toBeVisible()
  await expect(guide_row.locator('.resource-row-action')).toBeVisible()
  // Guide rows are internal NuxtLink anchors (external=false), so they do NOT carry
  // target="_blank" / rel="noopener noreferrer". Only external link rows have those attributes.
  // (Link rows verified below at the /links section.)

  const guide_layout = await guide_row.evaluate((row) => {
    const style = window.getComputedStyle(row)
    const media = row.querySelector('.resource-row-media')?.getBoundingClientRect()
    const action = row.querySelector('.resource-row-action')?.getBoundingClientRect()

    return {
      column_count: style.gridTemplateColumns.split(' ').length,
      gap: style.columnGap,
      padding: style.padding,
      media_width: media?.width,
      action_width: action?.width,
    }
  })

  await page.goto('/links', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const link_list = page.locator('.resource-list')
  const link_row = link_list.locator('.resource-row').first()
  await expect(link_list).toBeVisible()
  await expect(link_row.locator('.resource-row-media')).toBeVisible()
  await expect(link_row.locator('.resource-row-fallback-icon')).toBeVisible()
  await expect(link_row.locator('.resource-row-action')).toBeVisible()
  await expect(link_row).toHaveAttribute('target', '_blank')
  await expect(link_row).toHaveAttribute('rel', 'noopener noreferrer')

  const link_layout = await link_row.evaluate((row) => {
    const style = window.getComputedStyle(row)
    const media = row.querySelector('.resource-row-media')?.getBoundingClientRect()
    const action = row.querySelector('.resource-row-action')?.getBoundingClientRect()

    return {
      column_count: style.gridTemplateColumns.split(' ').length,
      gap: style.columnGap,
      padding: style.padding,
      media_width: media?.width,
      action_width: action?.width,
    }
  })

  expect(link_layout).toEqual(guide_layout)
})

test('navigates to product detail route with a safe buy CTA', async ({ page }) => {
  const detail = await openFirstProductDetail(page)

  await expect(page.locator('.compact-top-bar .top-bar-title')).toContainText('DW嚴選')
  await expect(page.locator('.compact-top-bar .top-bar-title')).toContainText(await detail.locator('.detail-title').textContent() ?? '')
  await expect(page.locator('.compact-top-bar .breadcrumb-link').nth(1)).toHaveAttribute('href', /\?category=.+/)
  await expect(detail.getByText('DW 怎麼說')).toBeVisible()
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('target', '_blank')
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('href', /https?:\/\//)

  const related_section = detail.locator('.related-products-section')
  await expect(related_section.getByRole('heading', { name: 'You may also like' })).toBeVisible()
  await expect(related_section.locator('.related-product-card')).toHaveCount(3)
  await expect(related_section.locator('.related-product-card').first()).toHaveAttribute('href', /\/products\/.+/)
})

test('fetches a single product detail json on navigation without prefetching details on home (028 split)', async ({ page }) => {
  const detail_requests: string[] = []
  page.on('request', (request) => {
    if (/\/api\/(products|guides)\/[^/]+\.json/.test(request.url())) {
      detail_requests.push(request.url())
    }
  })

  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  // 028 + ADR-3：首頁初載走共用 /api/content.json，prefetchOn interaction(visibility:false) 下
  // 不應背景 prefetch 任何商品／指南 detail JSON。
  expect(detail_requests).toEqual([])

  const first_card = page.locator('.product-card-link').first()
  await expect(first_card).toBeVisible()
  const href = await first_card.getAttribute('href')
  const expected_id = href?.split('/').at(-1) ?? ''
  expect(expected_id).not.toBe('')

  // client-side 導航才觸發 per-id fetch：只應請求自己那一筆 detail JSON。
  const detail_request = page.waitForRequest(/\/api\/products\/[^/]+\.json/)
  await first_card.click()
  const request = await detail_request

  await expect(page.locator('.product-detail-page')).toBeVisible()
  expect(request.url()).toContain(`/api/products/${expected_id}.json`)
})

test('fetches a single guide detail json on navigation into a guide (028 split)', async ({ page }) => {
  await page.goto('/guide', { waitUntil: 'networkidle' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_guide = page.locator('.resource-list .resource-row').first()
  await expect(first_guide).toBeVisible()
  const href = await first_guide.getAttribute('href')
  const expected_id = href?.split('/').at(-1) ?? ''
  expect(expected_id).not.toBe('')

  const detail_request = page.waitForRequest(/\/api\/guides\/[^/]+\.json/)
  await first_guide.click()
  const request = await detail_request

  expect(request.url()).toContain(`/api/guides/${expected_id}.json`)
})

test('keeps product detail and related image slots stable when images fail to load', async ({ page }) => {
  await openFirstProductDetail(page)
  await page.getByRole('button', { name: '切換色彩模式' }).click()

  const hero_tile = page.locator('.detail-hero-tile')
  await expect(hero_tile).toBeVisible()
  await hero_tile.locator('.detail-hero-image').evaluate((image) => {
    image.dispatchEvent(new Event('error'))
  })
  await expect(hero_tile.locator('.detail-image-fallback-icon')).toBeVisible()

  const related_tile = page.locator('.related-product-image-tile').first()
  await expect(related_tile).toBeVisible()
  await related_tile.locator('.related-product-image').evaluate((image) => {
    image.dispatchEvent(new Event('error'))
  })
  await expect(related_tile.locator('.related-product-fallback-icon')).toBeVisible()

  const media_contract = await page.evaluate(() => {
    const hero = document.querySelector('.detail-hero-tile')?.getBoundingClientRect()
    const related = document.querySelector('.related-product-image-tile')?.getBoundingClientRect()

    return {
      hero_width: hero?.width ?? 0,
      hero_height: hero?.height ?? 0,
      related_width: related?.width ?? 0,
      related_height: related?.height ?? 0,
    }
  })

  expect(Math.abs(media_contract.hero_width - media_contract.hero_height)).toBeLessThan(1)
  expect(Math.abs(media_contract.related_width - media_contract.related_height)).toBeLessThan(1)
})

test('navigates to tag taxonomy page from product detail tag pill', async ({ page }) => {
  await openFirstProductDetail(page)

  // Since 027: tag pills in the detail taxonomy row deep-link to /tag/{id} taxonomy pages.
  // (Previously they linked to /search?q=...; that contract was replaced by taxonomy routing.)
  const first_tag_pill = page.locator('.detail-taxonomy-row .catalog-pill[href^="/tag/"]').first()
  const tag_label = (await first_tag_pill.textContent())?.trim() ?? ''

  await expect(first_tag_pill).toHaveAttribute('href', /\/tag\//)
  await first_tag_pill.click()

  await expect(page).toHaveURL(/\/tag\//)
  // Taxonomy page should show the tag label in the breadcrumb title.
  await expect(page.locator('.compact-top-bar .top-bar-title')).toContainText(tag_label)
})

test('deep-links to the channel taxonomy page from a product card channel pill', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_channel = page.locator('.product-card .channel-badge[href^="/channel/"]').first()
  const channel_label = (await first_channel.textContent())?.trim() ?? ''

  await expect(first_channel).toHaveAttribute('href', /\/channel\//)
  await first_channel.click()

  await expect(page).toHaveURL(/\/channel\//)
  // Taxonomy page title is rendered in the layout breadcrumb (.top-bar-title), not a separate .taxonomy-page-title element (AC26).
  await expect(page.locator('.compact-top-bar .top-bar-title')).toContainText(channel_label)
})

test('renders direct product detail routes and unknown product not-found states', async ({ page }) => {
  const href = await getFirstProductHref(page)

  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  const detail = page.locator('.product-detail-page')
  await expect(detail).toBeVisible()
  await expect(detail.locator('.detail-title')).toBeVisible()

  await page.goto('/products/not-a-real-product', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '找不到頁面' })).toBeVisible()
  await expect(page.getByRole('link', { name: '回首頁' })).toBeVisible()
})

test('restores category and search state from query strings', async ({ page }, test_info) => {
  await page.goto('/?category=av-theater', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  if (test_info.project.name === 'desktop') {
    await expect(page.locator('.home-category-chip-list')).toBeHidden()
    await expect(page.locator('.compact-app-sidebar').getByRole('link', { name: /影音劇院/ })).toHaveAttribute('aria-current', 'page')
  }
  else {
    await expect(page.getByRole('button', { name: /影音劇院/ })).toHaveAttribute('aria-pressed', 'true')
  }

  await page.goto('/guide?tags=影音劇院', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toHaveText(getBreadcrumbTextPattern('指南'))
  await expect(page.getByRole('heading', { name: '指南列表' })).toHaveCount(0)
  await expect(page.locator('.tag-chip.is-active')).toHaveCount(0)

  await page.goto('/search?q=Sharp', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toHaveValue('Sharp')
  // Verify search returned at least one product result without binding to a specific product name.
  // (The first result may have a Chinese name like "夏普 AX-XP10T 水波爐" even when searching for "Sharp".)
  const products_section = page.locator('.search-result-section[data-section-id="products"]')
  await expect(products_section).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS })
  await expect(products_section.locator('.resource-row').first()).toBeVisible()
})

test('hydrates direct search query routes without mismatch warnings', async ({ page }) => {
  const hydration_messages: string[] = []

  page.on('console', (message) => {
    const text = message.text()

    if (text.includes('Hydration')) {
      hydration_messages.push(text)
    }
  })

  await page.goto('/search?q=Sharp', { waitUntil: 'networkidle' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.search-result-section[data-section-id="products"] .resource-row').first()).toBeVisible({
    timeout: SEARCH_RESULT_TIMEOUT_MS,
  })

  expect(hydration_messages).toEqual([])
})

test('separates search typing, autocomplete and submitted query state', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page).toHaveURL('/search')
  await expect(page.locator('.search-result-section')).toHaveCount(0)
  const popular_tag_section = page.locator('.search-popular-panel[data-section-id="tags"]')
  const popular_brand_section = page.locator('.search-popular-panel[data-section-id="brands"]')
  await expect(popular_tag_section.getByText('熱門標籤')).toBeVisible()
  await expect(popular_brand_section.getByText('熱門品牌')).toBeVisible()
  const popular_tag_count = await popular_tag_section.locator('.tag-chip').count()
  const popular_brand_count = await popular_brand_section.locator('.tag-chip').count()
  expect(popular_tag_count).toBeGreaterThan(0)
  expect(popular_brand_count).toBeGreaterThan(0)
  expect(popular_tag_count).toBeLessThanOrEqual(10)
  expect(popular_brand_count).toBeLessThanOrEqual(10)
  const popular_counts = await page.locator('.search-popular-panel .tag-count').allTextContents()
  // POPULAR_TAG_MIN_COUNT = 3 (from build-navigation.ts): chips with count >= 3 appear.
  // The old assertion used > 3 which incorrectly excluded counts of exactly 3.
  expect(popular_counts.every((count) => Number(count) >= 3)).toBe(true)
  // Removed: specific brand+count assertion (e.g. "Panasonic 6") — fragile against content growth.

  const search_input = page.getByPlaceholder('在找什麼嗎？™')
  await search_input.fill('Sharp')
  await page.waitForTimeout(400)
  await expect(page).toHaveURL('/search')
  await expect(page.locator('.search-history-panel')).toHaveCount(0)
  await expect(page.locator('.search-suggestion-list')).toBeVisible()
  await expect(page.locator('.search-suggestion-item').first()).toContainText(/產品|指南|連結/)

  await search_input.press('Enter')
  await expect(page).toHaveURL(/\/search\?q=Sharp/)
  await expect(page.locator('.search-result-section[data-section-id="products"] .resource-row').first()).toBeVisible({
    timeout: SEARCH_RESULT_TIMEOUT_MS,
  })

  const history_items = await page.evaluate(() => JSON.parse(localStorage.getItem('dwselect.search.history.v1') ?? '[]'))
  expect(history_items).toEqual(['Sharp'])

  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.search-history-panel').getByRole('button', { name: 'Sharp' })).toBeVisible()
})

test('does not submit search or write history when IME composition confirms with Enter', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const is_storage_accessible = await page.evaluate(() => {
    try {
      void window.localStorage
      return true
    }
    catch {
      return false
    }
  })
  expect(is_storage_accessible).toBe(true)

  const search_input = page.getByPlaceholder('在找什麼嗎？™')
  await search_input.fill('鍵盤')
  await search_input.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    bubbles: true,
    cancelable: true,
    isComposing: true,
  })

  await page.waitForTimeout(100)
  await expect(page).toHaveURL('/search')
  await expect(page.locator('.search-suggestion-panel')).toBeVisible()

  const history_items = await page.evaluate(() => JSON.parse(localStorage.getItem('dwselect.search.history.v1') ?? '[]'))
  expect(history_items).toEqual([])
})

test('defers search input query updates until IME composition ends', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const search_input = page.getByPlaceholder('在找什麼嗎？™')
  await expect(search_input).toBeEnabled()
  await expect(page.locator('.search-popular-panel[data-section-id="tags"]')).toBeVisible()

  await search_input.dispatchEvent('compositionstart')
  await search_input.fill('鍵')

  await page.waitForTimeout(100)
  await expect(page.locator('.search-suggestion-panel')).toHaveCount(0)
  await expect(page.locator('.search-popular-panel[data-section-id="tags"]')).toBeVisible()

  await search_input.fill('鍵盤')
  await search_input.dispatchEvent('compositionend')

  await expect(page.locator('.search-suggestion-panel')).toBeVisible()
})

test('keeps search usable when search history storage contains corrupted JSON', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    window.localStorage.setItem('dwselect.search.history.v1', '{broken-json')
  })
  await page.reload({ waitUntil: 'networkidle' })

  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page).toHaveURL('/search')

  await expect(page.locator('.search-popular-panel[data-section-id="tags"]')).toBeVisible()

  const search_input = page.getByPlaceholder('在找什麼嗎？™')
  await expect(search_input).toBeEnabled()
  await search_input.fill('Sharp')
  await expect(page.locator('.search-suggestion-panel')).toBeVisible()
  await search_input.press('Enter')

  await expect(page).toHaveURL(/\/search\?q=Sharp/)
  await expect(page.locator('.search-result-section[data-section-id="products"] .resource-row').first()).toBeVisible({
    timeout: SEARCH_RESULT_TIMEOUT_MS,
  })
})

test('recovers suggestions after the search index error retry path', async ({ page }) => {
  let should_fail_search_index = true

  await page.route('**/search-index.json', async (route) => {
    if (should_fail_search_index) {
      await route.abort('failed')
      return
    }

    await route.continue()
  })

  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const search_input = page.getByPlaceholder('在找什麼嗎？™')
  await search_input.fill('Sharp')

  const error_panel = page.locator('.search-error-panel')
  await expect(error_panel).toBeVisible()

  should_fail_search_index = false
  await error_panel.getByRole('button', { name: '重新嘗試' }).click()
  await expect(error_panel).toHaveCount(0)
  await expect(page.locator('.search-suggestion-list')).toBeVisible()
  await expect(page.locator('.search-suggestion-item').first()).toContainText(/產品|指南|連結/)
})

test('popular tags navigate to taxonomy pages; history items submit search', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.search-result-section')).toHaveCount(0)

  // Since 027: popular tag chips deep-link to /tag/{id} taxonomy pages, not search.
  // (UButton with :to="/tag/{id}" renders as an anchor; clicking navigates to the taxonomy page.)
  const first_popular_tag = page.locator('.search-popular-panel[data-section-id="tags"] .tag-chip').first()
  await expect(first_popular_tag).toBeVisible()
  await first_popular_tag.click()
  await expect(page).toHaveURL(/\/tag\//)
  // Taxonomy page should have loaded (breadcrumb title is the signal that the page is ready)
  await expect(page.locator('.compact-top-bar .top-bar-title')).toBeVisible()

  // History items still submit search (one-click → /search?q=...).
  // Populate history first by doing a real search, then verify clicking the history entry works.
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  const search_input = page.getByPlaceholder('在找什麼嗎？™')
  await search_input.fill('Sharp')
  await search_input.press('Enter')
  await expect(page).toHaveURL(/\/search\?q=Sharp/)
  await expect(page.locator('.search-result-section[data-section-id="products"] .resource-row').first()).toBeVisible({
    timeout: SEARCH_RESULT_TIMEOUT_MS,
  })

  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await page.locator('.search-history-panel').getByRole('button', { name: 'Sharp' }).click()
  await expect(page).toHaveURL(/\/search\?q=.*Sharp/)
})

test('renders submitted search as ordered resource sections with counts and non-empty sections only', async ({ page }) => {
  await page.goto('/search?q=%E9%9B%BB%E8%85%A6', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toHaveValue('電腦')

  const sections = page.locator('.search-result-section')
  await expect(sections).toHaveCount(3, { timeout: SEARCH_RESULT_TIMEOUT_MS })
  await expect(sections.nth(0)).toHaveAttribute('data-section-id', 'products')
  await expect(sections.nth(1)).toHaveAttribute('data-section-id', 'guides')
  await expect(sections.nth(2)).toHaveAttribute('data-section-id', 'links')
  await expect(sections.nth(0).getByRole('heading', { name: /^產品 \d+$/ })).toBeVisible()
  await expect(sections.nth(1).getByRole('heading', { name: /^指南 \d+$/ })).toBeVisible()
  await expect(sections.nth(2).getByRole('heading', { name: /^連結 \d+$/ })).toBeVisible()

  const product_row = page.locator('.search-result-section[data-section-id="products"] .resource-row').first()
  const guide_row = page.locator('.search-result-section[data-section-id="guides"] .resource-row').first()
  const link_row = page.locator('.search-result-section[data-section-id="links"] .resource-row').first()
  await expect(product_row.locator('.resource-row-media img')).toBeVisible()
  await expect(guide_row.locator('.resource-row-media img')).toBeVisible()
  await expect(link_row.locator('.resource-row-media')).toBeVisible()

  const media_contracts = await page.locator('.search-results .resource-row').evaluateAll((rows) => rows.map((row) => {
    const style = window.getComputedStyle(row)
    const media = row.querySelector('.resource-row-media')?.getBoundingClientRect()
    const image = row.querySelector('.resource-row-image')

    return {
      column_count: style.gridTemplateColumns.split(' ').length,
      media_width: media?.width ?? 0,
      media_height: media?.height ?? 0,
      object_fit: image === null ? null : window.getComputedStyle(image).objectFit,
    }
  }))
  expect(media_contracts.every((contract) => contract.column_count === 3)).toBe(true)
  expect(media_contracts.every((contract) => Math.abs(contract.media_width - contract.media_height) < 1)).toBe(true)
  expect(media_contracts.filter((contract) => contract.object_fit !== null).every((contract) => contract.object_fit === 'contain')).toBe(true)

  await page.goto('/search?q=Sharp', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.search-result-section[data-section-id="products"]')).toHaveCount(1, {
    timeout: SEARCH_RESULT_TIMEOUT_MS,
  })
  await expect(page.locator('.search-result-section[data-section-id="guides"]')).toHaveCount(0)
  await expect(page.locator('.search-result-section[data-section-id="links"]')).toHaveCount(0)
})

test('expands product categories in desktop sidebar only', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'desktop category sidebar check only runs on desktop')

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const sidebar = page.locator('.compact-app-sidebar')
  await expect(sidebar.locator('.desktop-category-items')).toBeVisible()
  await expect(sidebar.locator('.desktop-category-items').getByRole('link', { name: /其他/ })).toHaveCount(0)
  await sidebar.getByRole('link', { name: /影音劇院/ }).click()
  await expect(page).toHaveURL('/?category=av-theater')
  await expect(sidebar.getByRole('link', { name: /影音劇院/ })).toHaveAttribute('aria-current', 'page')
})

test('hides empty general categories from home chips and desktop sidebar', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'desktop sidebar source check only runs on desktop')

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page.locator('.home-category-chip-list')).toBeHidden()
  await expect(page.locator('.home-category-chip-list').getByRole('button', { name: /全部/ })).toHaveCount(0)
  await expect(page.locator('.category-chip-list').getByRole('button', { name: /其他/ })).toHaveCount(0)
  await expect(page.locator('.compact-app-sidebar .desktop-category-items').getByRole('link', { name: /其他/ })).toHaveCount(0)
})

test('keeps desktop product grid columns fluid without stretching sparse categories', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'desktop product grid sizing check only runs on the desktop project')

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const layout = await page.evaluate(() => {
    const grid = document.querySelector('.product-grid')?.getBoundingClientRect()
    const cards = Array.from(document.querySelectorAll('.product-card'))
      .slice(0, 12)
      .map((card) => card.getBoundingClientRect())

    return {
      first_row_card_count: cards.filter((card) => Math.abs(card.top - cards[0].top) < 2).length,
      first_row_right_gap: grid === undefined
        ? 0
        : grid.right - Math.max(...cards
          .filter((card) => Math.abs(card.top - cards[0].top) < 2)
          .map((card) => card.right)),
      max_card_width: Math.max(...cards.map((card) => card.width)),
      grid_width: grid?.width ?? 0,
    }
  })

  expect(layout.first_row_card_count).toBeGreaterThanOrEqual(6)
  expect(layout.first_row_right_gap).toBeLessThanOrEqual(1)
  expect(layout.max_card_width).toBeGreaterThan(240)
  expect(layout.grid_width).toBeGreaterThan(0)

  await page.goto('/?category=network', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const sparse_category_layout = await page.evaluate(() => {
    const grid = document.querySelector('.product-grid')?.getBoundingClientRect()
    const cards = Array.from(document.querySelectorAll('.product-card'))
      .map((card) => card.getBoundingClientRect())

    return {
      card_count: cards.length,
      grid_width: grid?.width ?? 0,
      max_card_width: Math.max(...cards.map((card) => card.width)),
    }
  })

  // card_count is not pinned—the test verifies the layout constraint (max card width)
  // rather than exact product count, which varies with content growth.
  expect(sparse_category_layout.card_count).toBeGreaterThanOrEqual(1)
  expect(sparse_category_layout.grid_width).toBeGreaterThan(0)
  expect(sparse_category_layout.max_card_width).toBeLessThan(360)
})
