import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

type LegacyProductContent = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  name: string
  price_text: string
  price: {
    amount: number | null
    currency: 'TWD' | 'JPY' | 'USD' | null
    unit: 'each' | 'kilogram' | null
    label: string | null
  }
  summary: string
  description: string
  purchase_url: string
  image_url: string
  channel_id: string
  category_id: string
  tags?: string[]
  tag_ids?: string[]
  reference_url: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
}

type TagDefinition = {
  id: string
  label: string
  description: string
  aliases: string[]
  nav_visible: boolean
  sort_order: number
}

type MigratedContent = {
  id: string
  from: string
  to: string
}

type RemovedTag = {
  content_id: string
  tag: string
  reason: 'platform' | 'root-category'
}

type DiscardedTag = {
  content_id: string
  tag: string
}

type MigrationSummary = {
  moved_content: MigratedContent[]
  removed_legacy_tags: RemovedTag[]
  discarded_noisy_tags: DiscardedTag[]
  manual_content_domain_decisions: MigratedContent[]
  empty_tag_ids: string[]
}

const DEFAULT_PRODUCTS_DIR = 'content/products'
const DEFAULT_GUIDES_DIR = 'content/guides'
const DEFAULT_LINKS_DIR = 'content/links'
const DEFAULT_TAXONOMIES_DIR = 'content/taxonomies'
const GUIDE_PRODUCT_IDS = new Set([
  '2026-06-02-日本米入門篇',
  '2026-06-02-aeron-chair',
])
const LINK_PRODUCT_IDS = new Set([
  '2026-06-02-b18',
  '2026-06-02-altwork-station',
])
const PLATFORM_TAGS = new Set(['PCHome', 'momo', '日亞', '美亞'])
const ROOT_CATEGORY_TAGS = new Set(['居家', '電腦', '廚房', '3C', '影音', '食材'])
const TARGET_TAGS: TagDefinition[] = [
  {
    id: 'display',
    label: '顯示設備',
    description: '螢幕、電視與影像顯示相關屬性。',
    aliases: ['電視', '螢幕'],
    nav_visible: true,
    sort_order: 10,
  },
  {
    id: 'ergonomic',
    label: '人體工學',
    description: '人體工學、坐姿、工作站與長時間使用舒適度相關屬性。',
    aliases: ['人體工學', '電腦椅'],
    nav_visible: true,
    sort_order: 20,
  },
  {
    id: 'rice',
    label: '米食',
    description: '白米、糙米、米飯料理與米類研究相關屬性。',
    aliases: ['米'],
    nav_visible: true,
    sort_order: 30,
  },
]

export async function migrateContentDomainTaxonomy(options: {
  products_dir?: string
  guides_dir?: string
  links_dir?: string
  taxonomies_dir?: string
} = {}): Promise<MigrationSummary> {
  const products_dir = options.products_dir ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = options.guides_dir ?? DEFAULT_GUIDES_DIR
  const links_dir = options.links_dir ?? DEFAULT_LINKS_DIR
  const taxonomies_dir = options.taxonomies_dir ?? DEFAULT_TAXONOMIES_DIR
  const summary: MigrationSummary = {
    moved_content: [],
    removed_legacy_tags: [],
    discarded_noisy_tags: [],
    manual_content_domain_decisions: [],
    empty_tag_ids: [],
  }
  const tag_alias_map = getTagAliasMap(TARGET_TAGS)

  await Promise.all([
    mkdir(guides_dir, { recursive: true }),
    mkdir(links_dir, { recursive: true }),
  ])
  await writeJson(join(taxonomies_dir, 'tags.json'), { items: TARGET_TAGS })
  await migrateLegacyTaxonomyLinks(taxonomies_dir, links_dir, summary)

  const product_file_names = await getJsonFileNames(products_dir)

  for (const file_name of product_file_names) {
    const source_path = join(products_dir, file_name)
    const product = JSON.parse(await readFile(source_path, 'utf8')) as LegacyProductContent
    const content_id = product.id || parse(file_name).name
    const tag_ids = migrateLegacyTags(content_id, product.tags ?? product.tag_ids ?? [], tag_alias_map, summary)

    if (GUIDE_PRODUCT_IDS.has(content_id)) {
      await writeJson(join(guides_dir, file_name), mapProductToGuide(product, content_id, tag_ids))
      await unlink(source_path)
      addMovedContent(summary, content_id, `content/products/${file_name}`, `content/guides/${file_name}`)
      addEmptyTagIds(summary, content_id, tag_ids)
      continue
    }

    if (LINK_PRODUCT_IDS.has(content_id)) {
      await writeJson(join(links_dir, file_name), mapProductToLink(product, content_id, tag_ids))
      await unlink(source_path)
      addMovedContent(summary, content_id, `content/products/${file_name}`, `content/links/${file_name}`)
      addEmptyTagIds(summary, content_id, tag_ids)
      continue
    }

    await writeJson(source_path, mapProductToMigratedProduct(product, content_id, tag_ids))
    addEmptyTagIds(summary, content_id, tag_ids)
  }

  summary.moved_content.sort(compareMovedContent)
  summary.manual_content_domain_decisions = [...summary.moved_content]
  summary.empty_tag_ids.sort((left_id, right_id) => left_id.localeCompare(right_id))
  summary.removed_legacy_tags.sort(compareRemovedTag)
  summary.discarded_noisy_tags.sort(compareDiscardedTag)

  return summary
}

function migrateLegacyTags(
  content_id: string,
  legacy_tags: string[],
  tag_alias_map: ReadonlyMap<string, string>,
  summary: MigrationSummary,
) {
  const tag_ids = new Set<string>()

  for (const legacy_tag of legacy_tags) {
    if (PLATFORM_TAGS.has(legacy_tag)) {
      summary.removed_legacy_tags.push({ content_id, tag: legacy_tag, reason: 'platform' })
      continue
    }

    if (ROOT_CATEGORY_TAGS.has(legacy_tag)) {
      summary.removed_legacy_tags.push({ content_id, tag: legacy_tag, reason: 'root-category' })
      continue
    }

    const tag_id = tag_alias_map.get(legacy_tag)

    if (tag_id === undefined) {
      summary.discarded_noisy_tags.push({ content_id, tag: legacy_tag })
      continue
    }

    tag_ids.add(tag_id)
  }

  return [...tag_ids].sort((left_tag_id, right_tag_id) => left_tag_id.localeCompare(right_tag_id))
}

function mapProductToMigratedProduct(product: LegacyProductContent, content_id: string, tag_ids: string[]) {
  return {
    id: content_id,
    status: product.status,
    name: product.name,
    price_text: product.price_text,
    price: product.price,
    summary: product.summary,
    description: product.description,
    purchase_url: product.purchase_url,
    image_url: product.image_url,
    channel_id: product.channel_id,
    category_id: product.category_id,
    tag_ids,
    reference_url: product.reference_url,
    created_at: product.created_at,
    updated_at: product.updated_at,
    published_at: product.published_at,
    unpublished_at: product.unpublished_at,
    archived_at: product.archived_at,
  }
}

function mapProductToGuide(product: LegacyProductContent, content_id: string, tag_ids: string[]) {
  return {
    id: content_id,
    status: product.status,
    title: product.name,
    summary: product.summary,
    source_url: product.purchase_url,
    image_url: product.image_url,
    category_ids: [product.category_id],
    tag_ids,
    related_product_ids: [],
    created_at: product.created_at,
    updated_at: product.updated_at,
    published_at: product.published_at,
    unpublished_at: product.unpublished_at,
    archived_at: product.archived_at,
  }
}

function mapProductToLink(product: LegacyProductContent, content_id: string, tag_ids: string[]) {
  return {
    id: content_id,
    status: product.status,
    title: product.name,
    summary: product.summary,
    url: product.purchase_url,
    icon: 'i-lucide-link',
    category_ids: [product.category_id],
    tag_ids,
    sort_order: getLinkSortOrder(content_id),
    created_at: product.created_at,
    updated_at: product.updated_at,
    published_at: product.published_at,
    unpublished_at: product.unpublished_at,
    archived_at: product.archived_at,
  }
}

async function migrateLegacyTaxonomyLinks(taxonomies_dir: string, links_dir: string, summary: MigrationSummary) {
  const source_path = join(taxonomies_dir, 'links.json')

  try {
    const taxonomy = JSON.parse(await readFile(source_path, 'utf8')) as {
      items?: Array<{
        id: string
        title: string
        subtitle: string
        url: string
        icon: string
        sort_order: number
      }>
    }

    for (const item of taxonomy.items ?? []) {
      const file_name = `${item.id}.json`
      const link = {
        id: item.id,
        status: 'published',
        title: item.title,
        summary: item.subtitle,
        url: item.url,
        icon: item.icon,
        category_ids: ['other'],
        tag_ids: [],
        sort_order: item.sort_order,
        created_at: '2026-06-02T00:00:00+08:00',
        updated_at: '2026-06-02T00:00:00+08:00',
        published_at: '2026-06-02T00:00:00+08:00',
        unpublished_at: null,
        archived_at: null,
      }

      await writeJson(join(links_dir, file_name), link)
      addMovedContent(summary, item.id, 'content/taxonomies/links.json', `content/links/${file_name}`)
      addEmptyTagIds(summary, item.id, [])
    }
  }
  catch (error) {
    if (isMissingFileError(error)) {
      return
    }

    throw error
  }
}

function getTagAliasMap(tags: TagDefinition[]) {
  const tag_alias_map = new Map<string, string>()

  for (const tag of tags) {
    tag_alias_map.set(tag.id, tag.id)
    tag_alias_map.set(tag.label, tag.id)

    for (const alias of tag.aliases) {
      tag_alias_map.set(alias, tag.id)
    }
  }

  return tag_alias_map
}

async function getJsonFileNames(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
}

async function writeJson(path: string, content: unknown) {
  await writeFile(path, `${JSON.stringify(content, null, 2)}\n`)
}

function addMovedContent(summary: MigrationSummary, id: string, from: string, to: string) {
  summary.moved_content.push({ id, from, to })
}

function addEmptyTagIds(summary: MigrationSummary, content_id: string, tag_ids: string[]) {
  if (tag_ids.length > 0) {
    return
  }

  summary.empty_tag_ids.push(content_id)
}

function getLinkSortOrder(content_id: string) {
  if (content_id === '2026-06-02-b18') {
    return 20
  }

  if (content_id === '2026-06-02-altwork-station') {
    return 30
  }

  return 999
}

function compareMovedContent(left_content: MigratedContent, right_content: MigratedContent) {
  return left_content.id.localeCompare(right_content.id)
}

function compareRemovedTag(left_tag: RemovedTag, right_tag: RemovedTag) {
  return `${left_tag.content_id}:${left_tag.tag}`.localeCompare(`${right_tag.content_id}:${right_tag.tag}`)
}

function compareDiscardedTag(left_tag: DiscardedTag, right_tag: DiscardedTag) {
  return `${left_tag.content_id}:${left_tag.tag}`.localeCompare(`${right_tag.content_id}:${right_tag.tag}`)
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && (error as { code?: unknown }).code === 'ENOENT'
}

async function runCli() {
  const summary = await migrateContentDomainTaxonomy()

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

if (process.argv[1]?.endsWith('migrate-content-domain-taxonomy.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
