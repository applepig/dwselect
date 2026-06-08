import { expect, test } from '@playwright/test'

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
  await expect(page.getByRole('heading', { name: '用 tag 找坑' })).toBeVisible()

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
})

test('renders direct product detail routes and unknown product not-found states', async ({ page }) => {
  await page.goto('/products/2026-06-02-sharp-65吋-xled', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.product-detail-page')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Sharp 65吋 XLED/ })).toBeVisible()

  await page.goto('/products/not-a-real-product', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('restores category, tag and search state from query strings', async ({ page }) => {
  await page.goto('/?category=av', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.category-chip.is-active')).toContainText('影音')

  await page.goto('/guide?tags=影音', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.locator('.tag-chip.is-active').first()).toContainText('影音')

  await page.goto('/search?q=Sharp', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toHaveValue('Sharp')
  await expect(page.locator('.product-card').first()).toContainText('Sharp')
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
