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

test('renders the compact app shell and responsive navigation', async ({ page }, test_info) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page.getByRole('heading', { name: 'DW嚴選' })).toBeVisible()

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

test('switches tabs without navigation reload and exposes search and link contracts', async ({ page }, test_info) => {
  const nav_root = getNavRoot(page, test_info.project.name)

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page.getByRole('heading', { name: '最近值得看' })).toBeVisible()

  await nav_root.getByRole('link', { name: '指南' }).click()
  await expect(page).toHaveURL('/guide')
  await expect(page.getByRole('heading', { name: '指南列表' })).toBeVisible()

  await nav_root.getByRole('link', { name: '搜尋' }).click()
  await expect(page).toHaveURL('/search')
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toBeVisible()

  await nav_root.getByRole('link', { name: '連結' }).click()
  await expect(page).toHaveURL('/links')
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
  await expect(guide_row.locator('.resource-row-media img')).toBeVisible()
  await expect(guide_row.locator('.resource-row-action')).toBeVisible()
  await expect(guide_row).toHaveAttribute('target', '_blank')
  await expect(guide_row).toHaveAttribute('rel', 'noopener noreferrer')

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
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_card = page.locator('.product-card-link').first()
  await expect(first_card).toBeVisible()
  await expect(first_card).toHaveAttribute('href', /\/products\/.+/)
  await first_card.click()
  await expect(page).toHaveURL(/\/products\/.+/)

  const detail = page.locator('.product-detail-page')
  await expect(detail).toBeVisible()
  await expect(detail.getByText('DW 怎麼說')).toBeVisible()
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('target', '_blank')
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('href', /https?:\/\//)

  const related_section = detail.locator('.related-products-section')
  await expect(related_section.getByRole('heading', { name: 'You may also like' })).toBeVisible()
  await expect(related_section.locator('.related-product-card')).toHaveCount(3)
  await expect(related_section.locator('.related-product-card').first()).toHaveAttribute('href', /\/products\/.+/)
})

test('keeps product detail and related image slots stable when images fail to load', async ({ page }) => {
  await page.goto('/products/2026-06-02-sharp-65-inch-xled', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
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

test('navigates to search by tag from product detail', async ({ page }) => {
  await page.goto('/products/2026-06-02-sharp-65-inch-xled', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_tag = page.locator('.detail-tag').first()
  const tag_label = (await first_tag.textContent())?.trim() ?? ''

  await expect(first_tag).toHaveAttribute('href', /\/search\?q=/)
  await first_tag.click()

  await expect(page).toHaveURL(new RegExp(`\\/search\\?q=${encodeURIComponent(tag_label)}`))
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toHaveValue(tag_label)
})

test('renders direct product detail routes and unknown product not-found states', async ({ page }) => {
  await page.goto('/products/2026-06-02-sharp-65-inch-xled', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.product-detail-page')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Sharp 65吋 XLED/ })).toBeVisible()

  await page.goto('/products/not-a-real-product', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('restores category and search state from query strings', async ({ page }) => {
  await page.goto('/?category=av-theater', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /影音劇院/ })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/guide?tags=影音劇院', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '指南列表' })).toBeVisible()
  await expect(page.locator('.tag-chip.is-active')).toHaveCount(0)

  await page.goto('/search?q=Sharp', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toHaveValue('Sharp')
  await expect(page.locator('.search-result-section[data-section-id="products"] .resource-row').first()).toContainText('Sharp', {
    timeout: SEARCH_RESULT_TIMEOUT_MS,
  })
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
  await page.goto('/search', { waitUntil: 'networkidle' })
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
  expect(popular_counts.every((count) => Number(count) > 3)).toBe(true)
  await expect(popular_brand_section.getByRole('link', { name: /Panasonic 6/ })).toBeVisible()

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

test('submits search only after clicking popular tags or history items', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.search-result-section')).toHaveCount(0)

  const first_popular_tag = page.locator('.search-popular-panel .tag-chip').first()
  await expect(first_popular_tag).toBeVisible()
  const tag_label = (await first_popular_tag.locator('span').first().textContent())?.trim() ?? ''
  await first_popular_tag.click()
  await expect(page).toHaveURL(new RegExp(`/search\\?q=.*${encodeURIComponent(tag_label)}`))
  await expect(page.locator('.search-results .resource-row').first()).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS })

  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await page.locator('.search-history-panel').getByRole('button', { name: tag_label }).click()
  await expect(page).toHaveURL(new RegExp(`/search\\?q=.*${encodeURIComponent(tag_label)}`))
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
  await expect(sections.nth(0).getByRole('heading', { name: /^商品 \d+$/ })).toBeVisible()
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

  await expect(page.locator('.category-chip-list').getByRole('button', { name: /全部/ })).toBeVisible()
  await expect(page.locator('.category-chip-list').getByRole('button', { name: /其他/ })).toHaveCount(0)
  await expect(page.locator('.compact-app-sidebar .desktop-category-items').getByRole('link', { name: /其他/ })).toHaveCount(0)
})

test('uses the wide desktop canvas without leaving a large blank gutter', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'wide layout check only runs on the desktop project')

  await page.setViewportSize({ width: 3440, height: 1440 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const layout = await page.evaluate(() => {
    const grid = document.querySelector('.product-grid')?.getBoundingClientRect()
    const cards = Array.from(document.querySelectorAll('.product-card'))
      .slice(0, 12)
      .map((card) => card.getBoundingClientRect())

    return {
      first_row_card_count: cards.filter((card) => Math.abs(card.top - cards[0].top) < 2).length,
      right_gap: grid ? window.innerWidth - grid.right : Number.POSITIVE_INFINITY,
    }
  })

  expect(layout.first_row_card_count).toBeGreaterThanOrEqual(8)
  expect(layout.right_gap).toBeLessThanOrEqual(48)
})
