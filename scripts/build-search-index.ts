import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, parse } from 'node:path'

import {
  category_taxonomy_schema,
  channel_taxonomy_schema,
  guide_schema,
  link_schema,
  product_schema,
  tag_taxonomy_schema,
  type CategoryDefinition,
  type ChannelDefinition,
  type Guide,
  type LinkDefinition,
  type Product,
  type TagDefinition,
} from '../app/utils/product-schema.ts'
import { buildSearchIndexPayload } from '../app/utils/search/search-index.ts'

type BuildSearchIndexSummary = {
  output_path: string
  document_count: number
}

const DEFAULT_PRODUCTS_DIR = 'content/products'
const DEFAULT_TAXONOMIES_DIR = 'content/taxonomies'
const DEFAULT_OUTPUT_PATH = 'public/search-index.json'

export async function buildSearchIndexFile(
  products_dir = DEFAULT_PRODUCTS_DIR,
  output_path = DEFAULT_OUTPUT_PATH,
  taxonomies_dir = DEFAULT_TAXONOMIES_DIR,
  guides_dir = join(dirname(products_dir), 'guides'),
  links_dir = join(dirname(products_dir), 'links'),
): Promise<BuildSearchIndexSummary> {
  const products = await readProducts(products_dir)
  const guides = await readGuides(guides_dir)
  const links = await readLinks(links_dir)
  const taxonomies = await readTaxonomies(taxonomies_dir)
  const payload = buildSearchIndexPayload({ products, guides, links }, {
    categories: taxonomies.categories,
    channels: taxonomies.channels,
    tags: taxonomies.tags,
    brands: taxonomies.brands,
  })
  await mkdir(getDirectoryName(output_path), { recursive: true })
  await writeFile(output_path, `${JSON.stringify(payload, null, 2)}\n`)

  return {
    output_path,
    document_count: payload.documents.length,
  }
}

async function readProducts(products_dir: string): Promise<Product[]> {
  return readContentFiles(products_dir, (raw_content, file_name) => product_schema.parse({
    ...JSON.parse(raw_content),
    id: parse(file_name).name,
  }))
}

async function readGuides(guides_dir: string): Promise<Guide[]> {
  return readContentFiles(guides_dir, (raw_content, file_name) => guide_schema.parse({
    ...JSON.parse(raw_content),
    id: parse(file_name).name,
  }))
}

async function readLinks(links_dir: string): Promise<LinkDefinition[]> {
  return readContentFiles(links_dir, (raw_content, file_name) => link_schema.parse({
    ...JSON.parse(raw_content),
    id: parse(file_name).name,
  }))
}

async function readTaxonomies(taxonomies_dir: string): Promise<{
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
}> {
  const [category_source, channel_source, tag_source, brand_source] = await Promise.all([
    readFile(join(taxonomies_dir, 'categories.json'), 'utf8'),
    readFile(join(taxonomies_dir, 'channels.json'), 'utf8'),
    readFile(join(taxonomies_dir, 'tags.json'), 'utf8'),
    readFile(join(taxonomies_dir, 'brands.json'), 'utf8'),
  ])

  return {
    categories: category_taxonomy_schema.parse(JSON.parse(category_source)).items,
    channels: channel_taxonomy_schema.parse(JSON.parse(channel_source)).items,
    tags: tag_taxonomy_schema.parse(JSON.parse(tag_source)).items,
    brands: tag_taxonomy_schema.parse(JSON.parse(brand_source)).items,
  }
}

async function readContentFiles<T>(content_dir: string, parseContent: (raw_content: string, file_name: string) => T): Promise<T[]> {
  const { readdir } = await import('node:fs/promises')
  let entries

  try {
    entries = await readdir(content_dir, { withFileTypes: true })
  }
  catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw error
  }

  const content_items: T[] = []

  for (const entry of entries.toSorted((left_entry, right_entry) => left_entry.name.localeCompare(right_entry.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    content_items.push(parseContent(await readFile(join(content_dir, entry.name), 'utf8'), entry.name))
  }

  return content_items
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && (error as { code?: unknown }).code === 'ENOENT'
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
