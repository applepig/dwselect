import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Guide, LinkDefinition, Product } from '../app/utils/product-schema.ts'
import { compareProducts } from '../app/utils/content/compare-products.ts'
import { collectNonEmptyTaxonomyIds } from '../app/utils/published-products/non-empty-taxonomy-ids.ts'
import { readPublicContentSource, type ContentReaderOptions, type PublicContentSource } from './content-reader.ts'
import { SITE_NAME, SITE_URL, isPublished } from './public-content.ts'

type BuildPublicDiscoveryOptions = ContentReaderOptions & {
  public_dir?: string
}

type BuildPublicDiscoverySummary = {
  output_paths: string[]
  product_count: number
  guide_count: number
  link_count: number
}

type RssItem = {
  id: string
  title: string
  summary: string
  url: string
  published_at: string | null
  updated_at: string
}

export const DEFAULT_PUBLIC_DIR = 'public'
const ROOT_ROUTES = ['/', '/guide', '/search', '/links']
const RSS_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const RSS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function buildPublicDiscoveryFiles(options: BuildPublicDiscoveryOptions = {}): Promise<BuildPublicDiscoverySummary> {
  const source = await readPublicContentSource(options)

  return buildPublicDiscoveryFilesFromSource(source, options)
}

export async function buildPublicDiscoveryFilesFromSource(
  source: PublicContentSource,
  options: Pick<BuildPublicDiscoveryOptions, 'public_dir'> = {},
): Promise<BuildPublicDiscoverySummary> {
  const public_dir = options.public_dir ?? DEFAULT_PUBLIC_DIR
  const published_products = source.products
    .filter(isPublished)
    .toSorted((left_product, right_product) => compareProducts(left_product, right_product, source.taxonomies))
  const published_guides = source.guides.filter(isPublished)
  const published_links = source.links.filter(isPublished)
  const output_paths = [
    join(public_dir, 'robots.txt'),
    join(public_dir, 'llms.txt'),
    join(public_dir, 'sitemap.xml'),
    join(public_dir, 'rss.xml'),
  ]

  await mkdir(public_dir, { recursive: true })
  await Promise.all([
    writeFile(output_paths[0], buildRobotsTxt()),
    writeFile(output_paths[1], buildLlmsTxt()),
    writeFile(output_paths[2], buildSitemapXml(published_products, {
      products: published_products,
      guides: published_guides,
      links: published_links,
      brand_ids: new Set(source.taxonomies.brands.map((brand) => brand.id)),
    })),
    writeFile(output_paths[3], buildRssXml(published_products, published_guides, published_links)),
  ])

  return {
    output_paths,
    product_count: published_products.length,
    guide_count: published_guides.length,
    link_count: published_links.length,
  }
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`
}

function buildLlmsTxt() {
  return `# ${SITE_NAME}\n\n> ${SITE_NAME}是個人選物網站，整理商品、指南與實用連結。\n\n## Public Data\n\n- [All content JSON](${SITE_URL}api/content.json): Published products, guides, links, and taxonomies.\n- [Search index](${SITE_URL}search-index.json): Lightweight searchable document index.\n- [Sitemap](${SITE_URL}sitemap.xml): Canonical public URLs.\n- [RSS](${SITE_URL}rss.xml): Recent published updates.\n\n## Usage Notes\n\nPublic agents may read and summarize public content. Do not attempt write actions, checkout automation, account actions, or content mutation from the public site.\n`
}

type TaxonomySitemapSource = {
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
  brand_ids: Set<string>
}

function buildSitemapXml(
  products: Product[],
  taxonomy_source: TaxonomySitemapSource,
) {
  const route_entries = ROOT_ROUTES.map((route) => buildSitemapUrlEntry(`${SITE_URL}${route.slice(1)}`))
  const product_entries = products.map((product) => buildSitemapUrlEntry(getProductUrl(product.id), getDateText(product.updated_at)))
  const guide_entries = taxonomy_source.guides.map((guide) => buildSitemapUrlEntry(getGuideUrl(guide.id), getDateText(guide.updated_at)))
  const taxonomy_entries = buildTaxonomySitemapEntries(taxonomy_source)

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...route_entries, ...product_entries, ...guide_entries, ...taxonomy_entries].join('\n')}\n</urlset>\n`
}

// Why: 非空 category／tag／brand／channel 與 route builder 共用 collectNonEmptyTaxonomyIds，使 sitemap 收錄的
// taxonomy 頁集合與 prerender 路由集合完全一致，不漂移。taxonomy id 為 ASCII kebab-case，無需 encodeURIComponent。
// brand id 走 /brand/（不出現於 /tag/，ADR-8）；channel id 來自 product offers（products-only，ADR-9）。
function buildTaxonomySitemapEntries(source: TaxonomySitemapSource) {
  const { category_ids, tag_ids, brand_ids, channel_ids } = collectNonEmptyTaxonomyIds(
    {
      products: source.products.map((product) => ({
        category_id: product.category_id,
        tag_ids: product.tag_ids,
        channel_ids: product.offers.map((offer) => offer.channel_id),
      })),
      guides: source.guides.map((guide) => ({ category_ids: guide.category_ids, tag_ids: guide.tag_ids })),
      links: source.links.map((link) => ({ category_ids: link.category_ids, tag_ids: link.tag_ids })),
    },
    { brand_ids: source.brand_ids },
  )

  return [
    ...Array.from(category_ids, (category_id) => buildSitemapUrlEntry(`${SITE_URL}category/${category_id}`)),
    ...Array.from(tag_ids, (tag_id) => buildSitemapUrlEntry(`${SITE_URL}tag/${tag_id}`)),
    ...Array.from(brand_ids, (brand_id) => buildSitemapUrlEntry(`${SITE_URL}brand/${brand_id}`)),
    ...Array.from(channel_ids, (channel_id) => buildSitemapUrlEntry(`${SITE_URL}channel/${channel_id}`)),
  ]
}

function buildSitemapUrlEntry(url: string, lastmod?: string) {
  if (!lastmod) {
    return `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`
  }

  return `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`
}

function buildRssXml(products: Product[], guides: Guide[], links: LinkDefinition[]) {
  const items = [
    ...products.map((product) => ({
      id: `product:${product.id}`,
      title: product.name,
      summary: product.summary,
      url: getProductUrl(product.id),
      published_at: product.published_at,
      updated_at: product.updated_at,
    })),
    ...guides.map((guide) => ({
      id: `guide:${guide.id}`,
      title: guide.title,
      summary: guide.summary,
      url: guide.source_url,
      published_at: guide.published_at,
      updated_at: guide.updated_at,
    })),
    ...links.map((link) => ({
      id: `link:${link.id}`,
      title: link.title,
      summary: link.summary,
      url: link.url,
      published_at: link.published_at,
      updated_at: link.updated_at,
    })),
  ].toSorted(compareRssItems)
  const item_xml = items.map(buildRssItemXml).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(SITE_NAME)}</title>\n    <link>${escapeXml(SITE_URL)}</link>\n    <description>${escapeXml(`${SITE_NAME}的商品、指南與實用連結更新`)}</description>\n${item_xml}\n  </channel>\n</rss>\n`
}

function buildRssItemXml(item: RssItem) {
  return `    <item>\n      <title>${escapeXml(item.title)}</title>\n      <link>${escapeXml(item.url)}</link>\n      <guid isPermaLink="true">${escapeXml(item.url)}</guid>\n      <pubDate>${escapeXml(formatRssDate(item.published_at ?? item.updated_at))}</pubDate>\n      <description>${escapeXml(item.summary)}</description>\n    </item>`
}

function compareRssItems(left_item: RssItem, right_item: RssItem) {
  if (left_item.published_at && !right_item.published_at) {
    return -1
  }

  if (!left_item.published_at && right_item.published_at) {
    return 1
  }

  const left_time = Date.parse(left_item.published_at ?? left_item.updated_at)
  const right_time = Date.parse(right_item.published_at ?? right_item.updated_at)
  const time_diff = right_time - left_time

  if (time_diff !== 0) {
    return time_diff
  }

  return left_item.id.localeCompare(right_item.id)
}

function getProductUrl(product_id: string) {
  return `${SITE_URL}products/${encodeURIComponent(product_id)}`
}

function getGuideUrl(guide_id: string) {
  return `${SITE_URL}guide/${encodeURIComponent(guide_id)}`
}

function getDateText(timestamp: string) {
  return timestamp.slice(0, 10)
}

function formatRssDate(timestamp: string) {
  const timestamp_match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/.exec(timestamp)

  if (!timestamp_match) {
    return new Date(timestamp).toUTCString().replace('GMT', '+0000')
  }

  const [, year, month, day, hour, minute, second, offset_sign, offset_hour, offset_minute] = timestamp_match
  const weekday = RSS_WEEKDAYS[new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()]
  const month_name = RSS_MONTHS[Number(month) - 1]

  return `${weekday}, ${day} ${month_name} ${year} ${hour}:${minute}:${second} ${offset_sign}${offset_hour}${offset_minute}`
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function runCli() {
  const args = process.argv.slice(2)
  const public_dir = getOptionValue(args, '--public-dir') ?? DEFAULT_PUBLIC_DIR
  const summary = await buildPublicDiscoveryFiles({
    products_dir: getOptionValue(args, '--products-dir'),
    guides_dir: getOptionValue(args, '--guides-dir'),
    links_dir: getOptionValue(args, '--links-dir'),
    taxonomies_dir: getOptionValue(args, '--taxonomies-dir'),
    public_dir,
  })

  process.stdout.write(`Public discovery files written: ${public_dir}\n`)
  process.stdout.write(`Products: ${summary.product_count}\n`)
  process.stdout.write(`Guides: ${summary.guide_count}\n`)
  process.stdout.write(`Links: ${summary.link_count}\n`)
}

function getOptionValue(args: string[], option: string) {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

if (process.argv[1]?.endsWith('build-public-discovery.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
