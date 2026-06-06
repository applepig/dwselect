import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

import { product_schema, type Product } from '../app/utils/product-schema.ts'
import { buildSearchIndexPayload } from '../app/utils/search/search-index.ts'

type BuildSearchIndexSummary = {
  output_path: string
  document_count: number
}

const DEFAULT_PRODUCTS_DIR = 'content/products'
const DEFAULT_OUTPUT_PATH = 'public/search-index.json'

export async function buildSearchIndexFile(
  products_dir = DEFAULT_PRODUCTS_DIR,
  output_path = DEFAULT_OUTPUT_PATH,
): Promise<BuildSearchIndexSummary> {
  const products = await readProducts(products_dir)
  const payload = buildSearchIndexPayload(products)
  await mkdir(getDirectoryName(output_path), { recursive: true })
  await writeFile(output_path, `${JSON.stringify(payload, null, 2)}\n`)

  return {
    output_path,
    document_count: payload.documents.length,
  }
}

async function readProducts(products_dir: string): Promise<Product[]> {
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(products_dir, { withFileTypes: true })
  const products: Product[] = []

  for (const entry of entries.toSorted((left_entry, right_entry) => left_entry.name.localeCompare(right_entry.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const raw_content = await readFile(join(products_dir, entry.name), 'utf8')
    products.push(product_schema.parse({
      ...JSON.parse(raw_content),
      id: parse(entry.name).name,
    }))
  }

  return products
}

function getDirectoryName(path: string) {
  const last_slash_index = path.lastIndexOf('/')

  if (last_slash_index === -1) {
    return '.'
  }

  return path.slice(0, last_slash_index)
}

async function runCli() {
  const args = process.argv.slice(2)
  const products_dir = getOptionValue(args, '--products-dir') ?? DEFAULT_PRODUCTS_DIR
  const output_path = getOptionValue(args, '--out') ?? DEFAULT_OUTPUT_PATH
  const summary = await buildSearchIndexFile(products_dir, output_path)

  process.stdout.write(`Search index written: ${summary.output_path}\n`)
  process.stdout.write(`Documents: ${summary.document_count}\n`)
}

function getOptionValue(args: string[], option: string) {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

if (process.argv[1]?.endsWith('build-search-index.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
