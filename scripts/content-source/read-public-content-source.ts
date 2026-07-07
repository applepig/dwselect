import { readFile } from 'node:fs/promises'
import { dirname, join, parse } from 'node:path'

import type { PublicTaxonomies } from '../../app/utils/public-content-payload.ts'
import {
  brand_taxonomy_schema,
  category_taxonomy_schema,
  channel_taxonomy_schema,
  guide_schema,
  link_schema,
  product_schema,
  tag_taxonomy_schema,
  type Guide,
  type LinkDefinition,
  type Product,
} from '../../app/utils/product-schema.ts'
import { listJsonDirents } from './list-json-files.ts'

export type PublicContentSource = {
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
  taxonomies: PublicTaxonomies
}

export type ContentReaderOptions = {
  products_dir?: string
  guides_dir?: string
  links_dir?: string
  taxonomies_dir?: string
}

export const DEFAULT_PRODUCTS_DIR = 'content/products'
export const DEFAULT_TAXONOMIES_DIR = 'content/taxonomies'

export async function readPublicContentSource(options: ContentReaderOptions = {}): Promise<PublicContentSource> {
  const products_dir = options.products_dir ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = options.guides_dir ?? join(dirname(products_dir), 'guides')
  const links_dir = options.links_dir ?? join(dirname(products_dir), 'links')
  const taxonomies_dir = options.taxonomies_dir ?? DEFAULT_TAXONOMIES_DIR
  const [products, guides, links, taxonomies] = await Promise.all([
    readProducts(products_dir),
    readGuides(guides_dir),
    readLinks(links_dir),
    readTaxonomies(taxonomies_dir),
  ])

  return {
    products,
    guides,
    links,
    taxonomies,
  }
}

export async function readProducts(products_dir: string): Promise<Product[]> {
  return readContentFiles(products_dir, (raw_content, file_name) => product_schema.parse({
    ...JSON.parse(raw_content),
    id: parse(file_name).name,
  }))
}

export async function readGuides(guides_dir: string): Promise<Guide[]> {
  return readContentFiles(guides_dir, (raw_content, file_name) => guide_schema.parse({
    ...JSON.parse(raw_content),
    id: parse(file_name).name,
  }))
}

export async function readLinks(links_dir: string): Promise<LinkDefinition[]> {
  return readContentFiles(links_dir, (raw_content, file_name) => link_schema.parse({
    ...JSON.parse(raw_content),
    id: parse(file_name).name,
  }))
}

export async function readTaxonomies(taxonomies_dir: string): Promise<PublicTaxonomies> {
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
    brands: brand_taxonomy_schema.parse(JSON.parse(brand_source)).items,
  }
}

async function readContentFiles<T>(content_dir: string, parseContent: (raw_content: string, file_name: string) => T): Promise<T[]> {
  const entries = await listJsonDirents(content_dir)

  return Promise.all(entries.map(async (entry) =>
    parseContent(await readFile(join(content_dir, entry.name), 'utf8'), entry.name),
  ))
}
