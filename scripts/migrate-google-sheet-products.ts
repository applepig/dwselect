import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

import type { Product } from '../app/utils/product-schema.ts'
import { getCategoryFallbackWarning, getCompactProductMigration } from './migrate-product-compact-schema.ts'

export const MIGRATE_GOOGLE_SHEET_PRODUCTS_DEPRECATED_NOTICE = 'Deprecated legacy Google Sheet importer: use Git-backed content domain migration for current content schema.'

type MigrationOptions = {
  date?: string
}

type MigratedProduct = {
  file_name: string
  content: Product
}

type SkippedRow = {
  row_number: number
  reason: string
}

type WarningRow = {
  row_number: number
  reason: string
}

type ErrorRow = {
  row_number: number
  field: string
  reason: string
}

type CollisionRow = {
  row_number: number
  original_id: string
  resolved_id: string
}

export type MigrationSummary = {
  created_count: number
  skipped_count: number
  skipped: SkippedRow[]
  warnings: WarningRow[]
  errors: ErrorRow[]
  collisions: CollisionRow[]
}

type MigrationResult = {
  products: MigratedProduct[]
  summary: MigrationSummary
}

const REQUIRED_HEADERS = ['name', 'price', 'desc', 'link_url', 'img_url', 'tags', 'category', 'reference']

const PINYIN_MAP: Record<string, string> = {
  商: 'shang',
  品: 'pin',
  名: 'ming',
  稱: 'cheng',
  称: 'cheng',
}

export function migrateGoogleSheetProducts(tsv_text: string, options: MigrationOptions = {}): MigrationResult {
  const date = options.date ?? getTodayDate()
  const timestamp = `${date}T00:00:00+08:00`
  const rows = parseTsvRows(tsv_text)
  const headers = rows[0]?.map((header) => header.trim()) ?? []
  const products: MigratedProduct[] = []
  const used_ids = new Set<string>()
  const summary: MigrationSummary = {
    created_count: 0,
    skipped_count: 0,
    skipped: [],
    warnings: [],
    errors: [],
    collisions: [],
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row_number = i + 1
    const raw_columns = rows[i] ?? []

    if (raw_columns.length === 1 && raw_columns[0] === '') {
      continue
    }

    if (raw_columns.length !== headers.length) {
      summary.warnings.push({
        row_number,
        reason: `column count mismatch: expected ${headers.length}, got ${raw_columns.length}`,
      })
      summary.skipped_count += 1
      continue
    }

    const row = getRow(headers, raw_columns)
    const name = row.name.trim()

    if (!name) {
      summary.skipped.push({ row_number, reason: 'missing name' })
      summary.skipped_count += 1
      continue
    }

    const purchase_url = row.link_url.trim()
    const image_url = row.img_url.trim()
    const reference_url = row.reference.trim() ? row.reference.trim() : null
    const url_error = getUrlError(purchase_url, image_url, reference_url)

    if (url_error) {
      summary.errors.push({ row_number, ...url_error })
      summary.skipped_count += 1
      continue
    }

    const category = row.category.trim()
    const category_warning = getCategoryFallbackWarning(category)

    if (category_warning !== null) {
      summary.warnings.push({ row_number, reason: category_warning })
    }

    const base_slug = getReadableSlug(name)
    const original_id = `${date}-${base_slug}`
    const resolved_id = resolveUniqueId(original_id, used_ids)
    used_ids.add(resolved_id)

    if (resolved_id !== original_id) {
      summary.collisions.push({ row_number, original_id, resolved_id })
    }

    const product = getCompactProductMigration({
      id: resolved_id,
      status: 'published',
      name,
      price_text: row.price,
      description: row.desc,
      purchase_url,
      image_url,
      category,
      tags: getTags(row.tags, purchase_url),
      reference_url,
      created_at: timestamp,
      updated_at: timestamp,
      published_at: timestamp,
      unpublished_at: null,
      archived_at: null,
    })

    products.push({
      file_name: `${resolved_id}.json`,
      content: product,
    })
  }

  summary.created_count = products.length

  return { products, summary }
}

export function formatMigrationSummary(summary: MigrationSummary): string {
  const lines = [
    MIGRATE_GOOGLE_SHEET_PRODUCTS_DEPRECATED_NOTICE,
    `Created: ${summary.created_count}`,
    `Skipped: ${summary.skipped_count}`,
  ]

  if (summary.skipped.length > 0) {
    lines.push('Skipped rows:')
    lines.push(...summary.skipped.map((row) => `- row ${row.row_number}: ${row.reason}`))
  }

  if (summary.warnings.length > 0) {
    lines.push('Warnings:')
    lines.push(...summary.warnings.map((row) => `- row ${row.row_number}: ${row.reason}`))
  }

  if (summary.errors.length > 0) {
    lines.push('Errors:')
    lines.push(...summary.errors.map((row) => `- row ${row.row_number} ${row.field}: ${row.reason}`))
  }

  if (summary.collisions.length > 0) {
    lines.push('Slug collisions:')
    lines.push(...summary.collisions.map((row) => `- row ${row.row_number}: ${row.original_id} -> ${row.resolved_id}`))
  }

  return `${lines.join('\n')}\n`
}

async function runCli() {
  const args = process.argv.slice(2)
  const input_path = args.find((arg) => !arg.startsWith('--'))
  const date = getOptionValue(args, '--date')
  const output_dir = getOptionValue(args, '--out-dir') ?? 'content/products'
  const should_replace = args.includes('--replace')

  if (!input_path) {
    throw new Error('Usage: node scripts/migrate-google-sheet-products.ts <input.tsv-or-url> --date YYYY-MM-DD [--out-dir content/products] [--replace]')
  }

  const tsv_text = await readMigrationInput(input_path)
  const result = migrateGoogleSheetProducts(tsv_text, { date })
  await mkdir(output_dir, { recursive: true })

  if (should_replace) {
    await removeJsonFiles(output_dir)
  }

  for (const product of result.products) {
    await writeFile(join(output_dir, product.file_name), `${JSON.stringify(product.content, null, 2)}\n`)
  }

  process.stdout.write(formatMigrationSummary(result.summary))
}

function getRow(headers: string[], columns: string[]) {
  return REQUIRED_HEADERS.reduce<Record<string, string>>((row, header) => {
    const index = headers.indexOf(header)
    row[header] = index >= 0 ? columns[index] ?? '' : ''

    return row
  }, {}) as Record<(typeof REQUIRED_HEADERS)[number], string>
}

function parseTsvRows(tsv_text: string) {
  const text = tsv_text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let in_quotes = false
  let ended_with_row_break = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (in_quotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        }
        else {
          in_quotes = false
        }
      }
      else {
        field += char
      }

      ended_with_row_break = false
      continue
    }

    if (char === '"' && field.length === 0) {
      in_quotes = true
      ended_with_row_break = false
      continue
    }

    if (char === '\t') {
      row.push(field)
      field = ''
      ended_with_row_break = false
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      ended_with_row_break = true
      continue
    }

    field += char
    ended_with_row_break = false
  }

  if (field.length > 0 || row.length > 0 || !ended_with_row_break) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

async function readMigrationInput(input_path: string) {
  if (isHttpUrl(input_path)) {
    const response = await fetch(input_path)

    if (!response.ok) {
      throw new Error(`Failed to fetch migration input: ${response.status} ${response.statusText}`)
    }

    return response.text()
  }

  const input_text = await readFile(input_path, 'utf8')

  if (input_path.endsWith('.html')) {
    const legacy_tsv_url = getLegacyTsvUrl(input_text)

    if (!legacy_tsv_url) {
      throw new Error(`Could not find google_tsv_url in ${input_path}`)
    }

    return readMigrationInput(legacy_tsv_url)
  }

  return input_text
}

function getLegacyTsvUrl(html_text: string) {
  const match = html_text.match(/google_tsv_url\s*=\s*["']([^"']+)["']/)

  return match?.[1]
}

async function removeJsonFiles(output_dir: string) {
  const entries = await readdir(output_dir, { withFileTypes: true })

  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => unlink(join(output_dir, entry.name))))
}

function getUrlError(purchase_url: string, image_url: string, reference_url: string | null) {
  if (!isHttpUrl(purchase_url)) {
    return { field: 'purchase_url', reason: 'must be a valid HTTP(S) URL' }
  }

  if (!isHttpUrl(image_url)) {
    return { field: 'image_url', reason: 'must be a valid HTTP(S) URL' }
  }

  if (reference_url !== null && !isHttpUrl(reference_url)) {
    return { field: 'reference_url', reason: 'must be a valid HTTP(S) URL' }
  }

  return null
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}

function getTags(raw_tags: string, purchase_url: string) {
  const tags = raw_tags.split(/\s+/).map((tag) => tag.trim()).filter(Boolean)
  const platform_tag = getPlatformTag(purchase_url)

  if (platform_tag && !tags.includes(platform_tag)) {
    tags.push(platform_tag)
  }

  return tags
}

function getPlatformTag(purchase_url: string) {
  const host = new URL(purchase_url).hostname.toLowerCase()

  if (host.includes('pchome.com.tw')) {
    return 'PCHome'
  }

  if (host.includes('momoshop.com.tw')) {
    return 'momo'
  }

  if (host === 'amazon.co.jp' || host.endsWith('.amazon.co.jp')) {
    return '日亞'
  }

  if (host === 'amazon.com' || host.endsWith('.amazon.com')) {
    return '美亞'
  }

  return null
}

function getReadableSlug(name: string) {
  const slug = Array.from(name)
    .map((char) => PINYIN_MAP[char] ? `-${PINYIN_MAP[char]}-` : char)
    .join('')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  if (slug) {
    return slug
  }

  return `product-${getShortHash(name)}`
}

function resolveUniqueId(original_id: string, used_ids: Set<string>) {
  if (!used_ids.has(original_id)) {
    return original_id
  }

  let suffix = 2
  let next_id = `${original_id}-${suffix}`

  while (used_ids.has(next_id)) {
    suffix += 1
    next_id = `${original_id}-${suffix}`
  }

  return next_id
}

function getShortHash(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 8)
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getOptionValue(args: string[], option_name: string) {
  const index = args.indexOf(option_name)

  if (index === -1) {
    return undefined
  }

  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`Missing value for ${option_name}`)
  }

  return args[index + 1]
}

const current_file = fileURLToPath(import.meta.url)

if (basename(process.argv[1] ?? '') === basename(current_file)) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
