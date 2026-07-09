import { join } from 'node:path'

import { DEFAULT_PRODUCTS_DIR, DEFAULT_TAXONOMIES_DIR, readPublicContentSource } from './content-source/read-public-content-source.ts'
import { DEFAULT_PUBLIC_DIR, buildPublicDiscoveryFilesFromSource } from './build-public-discovery.ts'
import { buildSearchIndexFileFromSource } from './build-search-index.ts'
import { getOptionValue, isDirectRun } from './cli-helpers.ts'

async function buildPublicArtifactsFiles(options: {
  products_dir?: string
  guides_dir?: string
  links_dir?: string
  taxonomies_dir?: string
  public_dir?: string
  search_index_output_path?: string
} = {}) {
  const public_dir = options.public_dir ?? DEFAULT_PUBLIC_DIR
  const search_index_output_path = options.search_index_output_path ?? join(public_dir, 'search-index.json')
  const source = await readPublicContentSource({
    products_dir: options.products_dir,
    guides_dir: options.guides_dir,
    links_dir: options.links_dir,
    taxonomies_dir: options.taxonomies_dir,
  })
  const [search_summary, discovery_summary] = await Promise.all([
    buildSearchIndexFileFromSource(source, search_index_output_path),
    buildPublicDiscoveryFilesFromSource(source, { public_dir }),
  ])

  return {
    public_dir,
    search_index_output_path: search_summary.output_path,
    document_count: search_summary.document_count,
    product_count: discovery_summary.product_count,
    guide_count: discovery_summary.guide_count,
    link_count: discovery_summary.link_count,
  }
}

async function runCli() {
  const args = process.argv.slice(2)
  const public_dir = getOptionValue(args, '--public-dir') ?? DEFAULT_PUBLIC_DIR
  const summary = await buildPublicArtifactsFiles({
    products_dir: getOptionValue(args, '--products-dir') ?? DEFAULT_PRODUCTS_DIR,
    guides_dir: getOptionValue(args, '--guides-dir'),
    links_dir: getOptionValue(args, '--links-dir'),
    taxonomies_dir: getOptionValue(args, '--taxonomies-dir') ?? DEFAULT_TAXONOMIES_DIR,
    public_dir,
    search_index_output_path: getOptionValue(args, '--search-index-out'),
  })

  process.stdout.write(`Public artifacts written: ${summary.public_dir}\n`)
  process.stdout.write(`Search index: ${summary.search_index_output_path}\n`)
  process.stdout.write(`Documents: ${summary.document_count}\n`)
  process.stdout.write(`Products: ${summary.product_count}\n`)
  process.stdout.write(`Guides: ${summary.guide_count}\n`)
  process.stdout.write(`Links: ${summary.link_count}\n`)
}

if (isDirectRun(import.meta.url)) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
