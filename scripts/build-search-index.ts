import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { buildSearchIndexPayload } from '../app/utils/search/search-index.ts'
import { DEFAULT_PRODUCTS_DIR, DEFAULT_TAXONOMIES_DIR, readPublicContentSource, type PublicContentSource } from './content-reader.ts'

type BuildSearchIndexSummary = {
  output_path: string
  document_count: number
}

export const DEFAULT_SEARCH_INDEX_OUTPUT_PATH = 'public/search-index.json'

export async function buildSearchIndexFile(
  products_dir = DEFAULT_PRODUCTS_DIR,
  output_path = DEFAULT_SEARCH_INDEX_OUTPUT_PATH,
  taxonomies_dir = DEFAULT_TAXONOMIES_DIR,
  guides_dir = join(dirname(products_dir), 'guides'),
  links_dir = join(dirname(products_dir), 'links'),
): Promise<BuildSearchIndexSummary> {
  const source = await readPublicContentSource({
    products_dir,
    guides_dir,
    links_dir,
    taxonomies_dir,
  })
  return buildSearchIndexFileFromSource(source, output_path)
}

export async function buildSearchIndexFileFromSource(
  source: PublicContentSource,
  output_path = DEFAULT_SEARCH_INDEX_OUTPUT_PATH,
): Promise<BuildSearchIndexSummary> {
  const payload = buildSearchIndexPayload({ products: source.products, guides: source.guides, links: source.links }, {
    categories: source.taxonomies.categories,
    channels: source.taxonomies.channels,
    tags: source.taxonomies.tags,
    brands: source.taxonomies.brands,
  })
  await mkdir(getDirectoryName(output_path), { recursive: true })
  await writeFile(output_path, `${JSON.stringify(payload, null, 2)}\n`)

  return {
    output_path,
    document_count: payload.documents.length,
  }
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
  const output_path = getOptionValue(args, '--out') ?? DEFAULT_SEARCH_INDEX_OUTPUT_PATH
  const taxonomies_dir = getOptionValue(args, '--taxonomies-dir') ?? DEFAULT_TAXONOMIES_DIR
  const summary = await buildSearchIndexFile(products_dir, output_path, taxonomies_dir)

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
