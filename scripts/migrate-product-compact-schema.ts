import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { product_schema, type Product } from '../app/utils/product-schema.ts'

type LegacyProduct = Omit<Product, 'price' | 'summary' | 'channel_id' | 'category_id' | 'tag_ids'> & {
  category: string
  tags?: string[]
  tag_ids?: string[]
}

type MigrationSummary = {
  migrated_count: number
}

const DEFAULT_PRODUCTS_DIR = 'content/products'

const CATEGORY_ID_BY_LEGACY_LABEL = new Map([
  ['居家', 'home'],
  ['廚房', 'kitchen'],
  ['電腦', 'computer'],
  ['3C', 'three-c'],
  ['影音', 'av'],
  ['食材', 'food'],
  ['其他', 'other'],
] as const)

const CHANNEL_ID_BY_HOST = new Map([
  ['24h.pchome.com.tw', 'pchome'],
  ['www.momoshop.com.tw', 'momo'],
  ['www.amazon.co.jp', 'amazonjp'],
  ['amzn.asia', 'amazonjp'],
  ['www.amazon.com', 'amazonus'],
  ['www.costco.com.tw', 'costco'],
] as const)

export function inferChannelId(purchase_url: string): Product['channel_id'] {
  try {
    const host = new URL(purchase_url).host.toLocaleLowerCase()

    return CHANNEL_ID_BY_HOST.get(host) ?? 'other'
  }
  catch {
    return 'other'
  }
}

export function getMigratedCategoryId(category: string): Product['category_id'] {
  const category_id = CATEGORY_ID_BY_LEGACY_LABEL.get(category.trim())

  return category_id ?? 'other'
}

export function getCategoryFallbackWarning(category: string) {
  const normalized_category = category.trim()

  if (CATEGORY_ID_BY_LEGACY_LABEL.has(normalized_category)) {
    return null
  }

  if (normalized_category === '') {
    return 'missing category; fallback category_id other'
  }

  return `unknown category "${normalized_category}"; fallback category_id other`
}

export function parseProductPrice(price_text: string, channel_id: Product['channel_id']): Product['price'] {
  const normalized_price = price_text.trim()

  if (normalized_price === '') {
    return getLabelPrice(price_text)
  }

  if (/^\d+\/kg$/u.test(normalized_price)) {
    return {
      amount: Number(normalized_price.replace('/kg', '')),
      currency: 'TWD',
      unit: 'kilogram',
      label: null,
    }
  }

  if (/^￥\d+$/u.test(normalized_price)) {
    return {
      amount: Number(normalized_price.replace('￥', '')),
      currency: 'JPY',
      unit: 'each',
      label: null,
    }
  }

  if (/^¥\d+$/u.test(normalized_price)) {
    return {
      amount: Number(normalized_price.replace('¥', '')),
      currency: 'JPY',
      unit: 'each',
      label: null,
    }
  }

  if (/^NT\$\s*[\d,]+$/iu.test(normalized_price)) {
    return {
      amount: Number(normalized_price.replace(/^NT\$\s*/iu, '').replaceAll(',', '')),
      currency: 'TWD',
      unit: 'each',
      label: null,
    }
  }

  if (/^US\$\s*[\d,]+$/iu.test(normalized_price)) {
    return {
      amount: Number(normalized_price.replace(/^US\$\s*/iu, '').replaceAll(',', '')),
      currency: 'USD',
      unit: 'each',
      label: null,
    }
  }

  if (/^\d+(~|～)\d+鎂$/u.test(normalized_price)) {
    return {
      amount: null,
      currency: 'USD',
      unit: 'each',
      label: price_text,
    }
  }

  if (/^\d+鎂$/u.test(normalized_price)) {
    return {
      amount: Number(normalized_price.replace('鎂', '')),
      currency: 'USD',
      unit: 'each',
      label: price_text,
    }
  }

  if (/^\d+(~|～)\d+$/u.test(normalized_price)) {
    return getLabelPrice(price_text)
  }

  if (/^\d+$/u.test(normalized_price)) {
    return {
      amount: Number(normalized_price),
      currency: getCurrencyForPlainNumber(channel_id),
      unit: 'each',
      label: null,
    }
  }

  return getLabelPrice(price_text)
}

export function getCompactProductMigration(legacy_product: LegacyProduct): Product {
  const { category, tags: _legacy_tags, tag_ids, ...product_without_category } = legacy_product
  const channel_id = inferChannelId(legacy_product.purchase_url)
  const migrated_product = {
    ...product_without_category,
    price: parseProductPrice(legacy_product.price_text, channel_id),
    summary: legacy_product.description,
    channel_id,
    category_id: getMigratedCategoryId(category),
    tag_ids: tag_ids ?? [],
  }

  return product_schema.parse(migrated_product)
}

export async function migrateProductCompactSchema(products_dir = DEFAULT_PRODUCTS_DIR): Promise<MigrationSummary> {
  const entries = await readdir(products_dir, { withFileTypes: true })
  let migrated_count = 0

  for (const entry of entries.toSorted((left_entry, right_entry) => left_entry.name.localeCompare(right_entry.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const product_path = join(products_dir, entry.name)
    const legacy_product = JSON.parse(await readFile(product_path, 'utf8')) as LegacyProduct
    const migrated_product = getCompactProductMigration(legacy_product)

    await writeFile(product_path, `${JSON.stringify(migrated_product, null, 2)}\n`)
    migrated_count += 1
  }

  return { migrated_count }
}

function getCurrencyForPlainNumber(channel_id: Product['channel_id']): Product['price']['currency'] {
  if (channel_id === 'amazonjp') {
    return 'JPY'
  }

  if (channel_id === 'amazonus') {
    return 'USD'
  }

  if (channel_id === 'pchome' || channel_id === 'momo' || channel_id === 'costco') {
    return 'TWD'
  }

  return null
}

function getLabelPrice(price_text: string): Product['price'] {
  return {
    amount: null,
    currency: null,
    unit: null,
    label: price_text,
  }
}

async function runCli() {
  const products_dir = process.argv[2] ?? DEFAULT_PRODUCTS_DIR
  const summary = await migrateProductCompactSchema(products_dir)

  process.stdout.write(`Products migrated: ${summary.migrated_count}\n`)
}

if (process.argv[1]?.endsWith('migrate-product-compact-schema.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
