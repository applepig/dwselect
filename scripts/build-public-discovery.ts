import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Guide, LinkDefinition, Product } from '../app/utils/product-schema.ts'
import { compareProducts } from '../app/utils/content/compare-products.ts'
import { readPublicContentSource, type ContentReaderOptions } from './content-reader.ts'
import { SITE_NAME, SITE_URL, buildPublicContentPayload, isPublished } from './public-content.ts'

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

const DEFAULT_PUBLIC_DIR = 'public'
const ROOT_ROUTES = ['/', '/guide', '/search', '/links']
const RSS_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const RSS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function buildPublicDiscoveryFiles(options: BuildPublicDiscoveryOptions = {}): Promise<BuildPublicDiscoverySummary> {
  const public_dir = options.public_dir ?? DEFAULT_PUBLIC_DIR
  const source = await readPublicContentSource(options)
  const payload = buildPublicContentPayload(source)
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
    join(public_dir, 'api', 'content.json'),
  ]

  await mkdir(join(public_dir, 'api'), { recursive: true })
  await Promise.all([
    writeFile(output_paths[0], buildRobotsTxt()),
    writeFile(output_paths[1], buildLlmsTxt()),
    writeFile(output_paths[2], buildSitemapXml(published_products)),
    writeFile(output_paths[3], buildRssXml(published_products, published_guides, published_links)),
    writeFile(output_paths[4], `${JSON.stringify(payload, null, 2)}\n`),
  ])

  return {
    output_paths,
    product_count: payload.products.cards.length,
    guide_count: payload.guides.length,
    link_count: payload.links.length,
  }
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`
}

function buildLlmsTxt() {
  return `# ${SITE_NAME}\n\n> ${SITE_NAME}是個人選物網站，整理商品、指南與實用連結。\n\n## Public Data\n\n- [All content JSON](${SITE_URL}api/content.json): Published products, guides, links, and taxonomies.\n- [Search index](${SITE_URL}search-index.json): Lightweight searchable document index.\n- [Sitemap](${SITE_URL}sitemap.xml): Canonical public URLs.\n- [RSS](${SITE_URL}rss.xml): Recent published updates.\n\n## Usage Notes\n\nPublic agents may read and summarize public content. Do not attempt write actions, checkout automation, account actions, or content mutation from the public site.\n`
}

function buildSitemapXml(products: Product[]) {
  const route_entries = ROOT_ROUTES.map((route) => buildSitemapUrlEntry(`${SITE_URL}${route.slice(1)}`))
  const product_entries = products.map((product) => buildSitemapUrlEntry(getProductUrl(product.id), getDateText(product.updated_at)))

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...route_entries, ...product_entries].join('\n')}\n</urlset>\n`
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
