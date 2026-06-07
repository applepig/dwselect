import { expect, test } from '@playwright/test'

test('renders the compact app shell and responsive navigation', async ({ page }, test_info) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
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

test('switches tabs without navigation reload and exposes search and link contracts', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  await expect(page.getByRole('heading', { name: '最近值得看' })).toBeVisible()

  await page.getByRole('button', { name: '指南' }).click()
  await expect(page.getByRole('heading', { name: '用 tag 找坑' })).toBeVisible()

  await page.getByRole('button', { name: '搜尋' }).click()
  await expect(page.getByPlaceholder('在找什麼嗎？™')).toBeVisible()

  await page.getByRole('button', { name: '連結' }).click()
  await expect(page.getByRole('link', { name: /applepig\.idv\.tw/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /applepig\.idv\.tw/ })).toHaveAttribute('href', 'https://applepig.idv.tw')
  await expect(page).toHaveURL('/')
})

test('opens and closes product detail with a safe buy CTA', async ({ page }, test_info) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_card = page.locator('.product-card-button').first()
  await expect(first_card).toBeVisible()
  await first_card.click()

  const detail = page.getByRole('dialog', { name: /商品詳情/ })
  await expect(detail).toBeVisible()
  await expect(detail.getByText('DW 怎麼說')).toBeVisible()
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('target', '_blank')
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(detail.locator('.detail-buy-cta')).toHaveAttribute('href', /https?:\/\//)

  if (test_info.project.name === 'phone') {
    await expect(detail.locator('.product-detail-sheet')).toBeVisible()
  } else {
    await expect(detail.locator('.product-detail-modal')).toBeVisible()
  }

  await detail.getByRole('button', { name: '關閉商品詳情' }).click()
  await expect(detail).toBeHidden()
})

test('uses the wide desktop canvas without leaving a large blank gutter', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'wide layout check only runs on the desktop project')

  await page.setViewportSize({ width: 3440, height: 1440 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
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
