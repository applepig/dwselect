import { expect, test } from '@playwright/test'

// 036 M2（rework）＋M2.1＋M2.2：related 區塊版面契約（AC5–AC7、AC5b／AC6b／AC6c）。
// 卡片直接重用 product-card.vue（ADR-036-6），selector 一律指 related 區塊內的 .product-card；
// 斷點對齊 iPad mini（≥744px 3 欄、<744px 單欄橫式，ADR-036-7）；meta pill 折行契約
// （ADR-036-8）因 meta 列在共用卡上，首頁卡上下文也在本檔一併鎖住。product 與 guide 共用
// related-products-section.vue 單一元件（AC8），故以 product detail 頁鎖住契約即涵蓋兩頁；
// 現有 guide content 的 related_product_ids 皆空，無法直接對 guide 頁量測。

async function openRelatedSection(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const first_card = page.locator('.product-card-link').first()
  await expect(first_card).toBeVisible()

  const href = await first_card.getAttribute('href')
  if (href === null) {
    throw new Error('Expected first product card to have an href')
  }

  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const related_section = page.locator('.related-products-section')
  await expect(related_section).toBeVisible()

  return related_section
}

test('fills the desktop related first row without a trailing empty track', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'AC5 full-row contract is a desktop-width behaviour')

  const related_section = await openRelatedSection(page)

  const metrics = await related_section.locator('.related-products-grid').evaluate((grid) => {
    const grid_rect = grid.getBoundingClientRect()
    const cards = Array.from(grid.querySelectorAll('.product-card')).map((card) => card.getBoundingClientRect())
    const first_row = cards.filter((card) => Math.abs(card.top - cards[0].top) < 2)

    return {
      card_count: cards.length,
      first_row_right_gap: grid_rect.right - Math.max(...first_row.map((card) => card.right)),
      grid_width: grid_rect.width,
    }
  })

  // card_count is intentionally not pinned—the contract is that the first row of cards
  // reaches the right edge of the grid, however many related items exist.
  expect(metrics.card_count).toBeGreaterThanOrEqual(1)
  expect(metrics.grid_width).toBeGreaterThan(0)
  expect(metrics.first_row_right_gap).toBeLessThanOrEqual(1)
})

test('aligns the related grid with the home grid at the iPad-mini boundary (3 columns from 744px)', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'AC5b boundary widths are probed via setViewportSize from a single project')

  const related_section = await openRelatedSection(page)

  // AC5b：744px（iPad mini 直向）與 767px（原 2 欄檔位上緣）都要 3 欄滿列，
  // 消除首頁 auto-fill（744px 塞得下 3×220px）與 related 固定欄數在此區間的分岔。
  for (const width of [744, 767]) {
    await page.setViewportSize({ width, height: 1100 })

    const metrics = await related_section.locator('.related-products-grid').evaluate((grid) => {
      const grid_rect = grid.getBoundingClientRect()
      const cards = Array.from(grid.querySelectorAll('.product-card')).map((card) => card.getBoundingClientRect())
      const first_row = cards.filter((card) => Math.abs(card.top - cards[0].top) < 2)

      return {
        first_row_count: first_row.length,
        first_row_right_gap: grid_rect.right - Math.max(...first_row.map((card) => card.right)),
      }
    })

    expect(metrics.first_row_count, `expected 3 columns at ${width}px`).toBe(3)
    expect(metrics.first_row_right_gap, `expected full first row at ${width}px`).toBeLessThanOrEqual(1)
  }
})

test('lays related cards out as a single-column horizontal list below 744px', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'phone', 'AC6b horizontal layout applies below the 744px breakpoint')

  const related_section = await openRelatedSection(page)

  const metrics = await related_section.locator('.related-products-grid').evaluate((grid) => {
    const cards = Array.from(grid.querySelectorAll('.product-card'))
    const card_rects = cards.map((card) => card.getBoundingClientRect())
    const first_card = cards[0]
    const tile = first_card?.querySelector('.product-image-tile')?.getBoundingClientRect()
    const body = first_card?.querySelector('.product-card-body')?.getBoundingClientRect()

    return {
      card_count: cards.length,
      // 單欄：每張卡各占一 row（top 全不同）且左緣對齊。
      row_count: new Set(card_rects.map((card) => Math.round(card.top))).size,
      distinct_lefts: new Set(card_rects.map((card) => Math.round(card.left))).size,
      card_width: card_rects[0]?.width ?? 0,
      tile_right: tile?.right ?? 0,
      tile_width: tile?.width ?? 0,
      tile_height: tile?.height ?? 0,
      body_left: body?.left ?? 0,
      document_client_width: document.documentElement.clientWidth,
      document_scroll_width: document.documentElement.scrollWidth,
    }
  })

  // AC6b：單欄橫式——方形縮圖靠左、內容靠右，不橫向溢出。
  expect(metrics.card_count).toBeGreaterThanOrEqual(1)
  expect(metrics.row_count).toBe(metrics.card_count)
  expect(metrics.distinct_lefts).toBe(1)
  expect(Math.abs(metrics.tile_width - metrics.tile_height)).toBeLessThanOrEqual(1)
  expect(metrics.tile_width).toBeLessThan(metrics.card_width / 2)
  expect(metrics.tile_right).toBeLessThanOrEqual(metrics.body_left + 1)
  expect(metrics.document_scroll_width).toBeLessThanOrEqual(metrics.document_client_width)

  // 顯示欄位不變（AC6b）：商品名、summary、price pill、channel pill 都在。
  await expect(related_section.locator('.product-name').first()).toBeVisible()
  await expect(related_section.locator('.product-summary').first()).toBeVisible()
  await expect(related_section.locator('.product-card-price').first()).toBeVisible()
  await expect(related_section.locator('.channel-badge').first()).toBeVisible()
})

test('lays related cards out as image-over-text with a full-width square tile', async ({ page }, test_info) => {
  // <744px 改橫式（AC6b），方圖寬＝卡內容寬的直式契約只適用 ≥744px。
  test.skip(test_info.project.name === 'phone', 'below 744px the related card switches to the horizontal layout (AC6b)')

  const related_section = await openRelatedSection(page)

  const card_metrics = await related_section.locator('.product-card').first().evaluate((card) => {
    const card_rect = card.getBoundingClientRect()
    const tile = card.querySelector('.product-image-tile')?.getBoundingClientRect()
    const body = card.querySelector('.product-card-body')?.getBoundingClientRect()
    const style = window.getComputedStyle(card)
    const content_width = card_rect.width
      - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
      - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth)

    return {
      content_width,
      tile_width: tile?.width ?? 0,
      tile_height: tile?.height ?? 0,
      tile_bottom: tile?.bottom ?? 0,
      body_top: body?.top ?? 0,
    }
  })

  expect(Math.abs(card_metrics.tile_width - card_metrics.content_width)).toBeLessThanOrEqual(1)
  expect(Math.abs(card_metrics.tile_width - card_metrics.tile_height)).toBeLessThanOrEqual(1)
  expect(card_metrics.tile_bottom).toBeLessThanOrEqual(card_metrics.body_top + 1)

  // AC6：related 卡顯示與首頁卡一致的欄位——商品名、summary、price pill、channel pill。
  await expect(related_section.locator('.product-name').first()).toBeVisible()
  await expect(related_section.locator('.product-summary').first()).toBeVisible()
  await expect(related_section.locator('.product-card-price').first()).toBeVisible()
  await expect(related_section.locator('.channel-badge').first()).toBeVisible()
})

test('keeps a sparse related list at the standard card width without stretching', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'AC7 sparse width contract is asserted at desktop width where tracks are widest')

  const related_section = await openRelatedSection(page)
  const grid = related_section.locator('.related-products-grid')

  const full_row_card_width = await grid.evaluate((element) => {
    return element.querySelector('.product-card')?.getBoundingClientRect().width ?? 0
  })
  expect(full_row_card_width).toBeGreaterThan(0)

  // 現有內容無 1～2 筆樣本（product 恆 3 筆、guide 皆空），依 AC7 註記以 DOM 移除重現稀疏情境。
  const sparse_metrics = await grid.evaluate((element) => {
    const cards = Array.from(element.querySelectorAll('.product-card'))
    for (const card of cards.slice(1)) {
      card.remove()
    }

    const remaining_card = element.querySelector('.product-card')
    if (remaining_card === null) {
      throw new Error('Expected one related card to remain after sparse reduction')
    }

    const card_rect = remaining_card.getBoundingClientRect()
    const grid_rect = element.getBoundingClientRect()

    return {
      card_width: card_rect.width,
      card_left: card_rect.left,
      grid_width: grid_rect.width,
      grid_left: grid_rect.left,
    }
  })

  expect(Math.abs(sparse_metrics.card_width - full_row_card_width)).toBeLessThanOrEqual(1)
  expect(sparse_metrics.card_width).toBeLessThan(sparse_metrics.grid_width / 2)
  expect(Math.abs(sparse_metrics.card_left - sparse_metrics.grid_left)).toBeLessThanOrEqual(1)
})

test('wraps an over-long curated related list to extra rows without horizontal overflow', async ({ page }, test_info) => {
  test.skip(test_info.project.name !== 'desktop', 'AC7 wrap contract is asserted at desktop width where a row holds the most cards')

  const related_section = await openRelatedSection(page)

  // guide curated 筆數不設上限但現有內容皆空（AC7 註記），以 clone 既有卡片重現超過一列的情境。
  const wrap_metrics = await related_section.locator('.related-products-grid').evaluate((grid) => {
    const template_card = grid.querySelector('.product-card')
    if (template_card === null) {
      throw new Error('Expected an existing related card to clone')
    }

    const base_card_width = template_card.getBoundingClientRect().width
    const clone_count = 4
    for (let index = 0; index < clone_count; index += 1) {
      grid.append(template_card.cloneNode(true))
    }

    const cards = Array.from(grid.querySelectorAll('.product-card')).map((card) => card.getBoundingClientRect())

    return {
      card_count: cards.length,
      base_card_width,
      max_card_width: Math.max(...cards.map((card) => card.width)),
      row_count: new Set(cards.map((card) => Math.round(card.top))).size,
      document_client_width: document.documentElement.clientWidth,
      document_scroll_width: document.documentElement.scrollWidth,
    }
  })

  expect(wrap_metrics.card_count).toBeGreaterThanOrEqual(5)
  expect(wrap_metrics.row_count).toBeGreaterThanOrEqual(2)
  expect(Math.abs(wrap_metrics.max_card_width - wrap_metrics.base_card_width)).toBeLessThanOrEqual(1)
  expect(wrap_metrics.document_scroll_width).toBeLessThanOrEqual(wrap_metrics.document_client_width)
})

// AC6c（M2.2）：meta 列 pill 折行契約的注入＋量測 helper。不依賴特定 content 樣本——
// 先量現有（短）字樣的同列狀態，再注入實例級長字樣（TWD 價格＋Amazon JP）並按容器實寬
// 加長 price，構造「兩 pill 同列必塞不下、單 pill 不超過容器寬（不觸 ellipsis 防線）」的狀態。
async function measurePillWrap(card) {
  return card.evaluate((card_el) => {
    const meta = card_el.querySelector('.product-card-meta')
    const price = card_el.querySelector('.product-card-price')
    const badge = card_el.querySelector('.channel-badge')
    if (meta === null || price === null || badge === null) {
      throw new Error('Expected meta row, price pill and channel badge inside the product card')
    }

    const meta_style = window.getComputedStyle(meta)
    const content_width = meta.clientWidth
      - Number.parseFloat(meta_style.paddingLeft) - Number.parseFloat(meta_style.paddingRight)
    const gap = Number.parseFloat(meta_style.columnGap) || 0

    const short_price_rect = price.getBoundingClientRect()
    const short_badge_rect = badge.getBoundingClientRect()
    const short_sample = {
      same_row: Math.abs(short_price_rect.top - short_badge_rect.top) < 2,
      badge_after_price: short_badge_rect.left >= short_price_rect.right - 1,
    }

    price.textContent = 'TWD 16,888'
    for (const node of Array.from(badge.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = ''
      }
    }
    badge.append(document.createTextNode('Amazon JP'))

    // 加長 price 直到兩 pill 同列必塞不下；0.85 上限保住「單 pill 不超容器寬」的前提。
    // 以 scrollWidth（內容真實寬）判定而非 bounding box——缺陷狀態下 pill 會被 flex 壓縮，
    // box 寬失真，用它探測會把「被壓縮」誤判成「塞得下」。
    let guard = 0
    while (
      price.scrollWidth + gap + badge.scrollWidth <= content_width
      && price.scrollWidth <= content_width * 0.85
      && guard < 60
    ) {
      price.textContent += '8'
      guard += 1
    }

    if (price.scrollWidth + gap + badge.scrollWidth <= content_width) {
      throw new Error('Could not make both pills exceed the meta row width; the wrap contract has nothing to probe')
    }

    const price_rect = price.getBoundingClientRect()
    const badge_rect = badge.getBoundingClientRect()

    const card_rect = card_el.getBoundingClientRect()

    return {
      short_sample,
      price_clipped: price.scrollWidth > price.clientWidth + 1,
      badge_clipped: badge.scrollWidth > badge.clientWidth + 1,
      price_top: price_rect.top,
      badge_top: badge_rect.top,
      price_right: price_rect.right,
      badge_right: badge_rect.right,
      card_right: card_rect.right,
    }
  })
}

function assertPillWrapContract(metrics) {
  // 短字樣（現有 content）行為不變：同列、channel 在 price 右側。
  expect(metrics.short_sample.same_row).toBe(true)
  expect(metrics.short_sample.badge_after_price).toBe(true)

  // 長字樣：兩 pill 各自完整顯示（無 ellipsis 截字），塞不下時 channel 折到第二列，仍在卡內。
  expect(metrics.price_clipped).toBe(false)
  expect(metrics.badge_clipped).toBe(false)
  expect(metrics.badge_top).toBeGreaterThan(metrics.price_top + 2)
  expect(metrics.price_right).toBeLessThanOrEqual(metrics.card_right + 1)
  expect(metrics.badge_right).toBeLessThanOrEqual(metrics.card_right + 1)
}

test('wraps long meta pills to a second row on the home product card (AC6c)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)

  const card = page.locator('.product-card').first()
  await expect(card).toBeVisible()

  assertPillWrapContract(await measurePillWrap(card))
})

test('wraps long meta pills to a second row on the related product card (AC6c)', async ({ page }) => {
  const related_section = await openRelatedSection(page)
  const card = related_section.locator('.product-card').first()
  await expect(card).toBeVisible()

  assertPillWrapContract(await measurePillWrap(card))
})

test('keeps the related section inside narrow viewports without horizontal overflow', async ({ page }, test_info) => {
  test.skip(test_info.project.name === 'desktop', 'narrow-viewport overflow contract targets phone and tablet widths')

  const related_section = await openRelatedSection(page)

  const overflow_metrics = await related_section.locator('.related-products-grid').evaluate((grid) => {
    const grid_rect = grid.getBoundingClientRect()

    return {
      grid_right: grid_rect.right,
      document_client_width: document.documentElement.clientWidth,
      document_scroll_width: document.documentElement.scrollWidth,
    }
  })

  expect(overflow_metrics.grid_right).toBeLessThanOrEqual(overflow_metrics.document_client_width)
  expect(overflow_metrics.document_scroll_width).toBeLessThanOrEqual(overflow_metrics.document_client_width)
})
