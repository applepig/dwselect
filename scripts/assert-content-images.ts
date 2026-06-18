import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { DEFAULT_PRODUCTS_DIR, readPublicContentSource, type ContentReaderOptions } from './content-reader.ts'
import { isPublished } from './public-content.ts'

export type AssertContentImagesMissing = {
  domain: 'products' | 'guides'
  content_id: string
  image_file: string
  source_path: string
}

export type AssertContentImagesSummary = {
  checked: number
  missing: AssertContentImagesMissing[]
}

export class AssertContentImagesError extends Error {
  readonly summary: AssertContentImagesSummary

  constructor(summary: AssertContentImagesSummary) {
    super([
      `Missing ${summary.missing.length} published content image source file(s):`,
      ...summary.missing.map((entry) => `- ${entry.domain}/${entry.content_id} (${entry.image_file}): ${entry.source_path}`),
    ].join('\n'))
    this.name = 'AssertContentImagesError'
    this.summary = summary
  }
}

// Case 2 的確定性 guard：published product／guide 的本地 image_file 必須在 content/{domain}/images/ 下存在，
// 否則 <NuxtImg>／IPX 在 production 只會 404（@nuxt/image 不保證 generate 失敗）。在 generate 前置鏈跑此檢查，
// 缺圖即中止，把「缺圖 = build 失敗」留在 content 層，不依賴 IPX 的版本相依行為。
export async function assertContentImages(options: ContentReaderOptions = {}): Promise<AssertContentImagesSummary> {
  const products_dir = options.products_dir ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = options.guides_dir ?? join(dirname(products_dir), 'guides')
  const source = await readPublicContentSource(options)
  const missing: AssertContentImagesMissing[] = []
  let checked = 0

  const references = [
    ...source.products.filter(isPublished).map((product) => ({
      domain: 'products' as const,
      content_id: product.id,
      image_file: product.image_file,
      images_dir: join(products_dir, 'images'),
    })),
    ...source.guides.filter(isPublished).map((guide) => ({
      domain: 'guides' as const,
      content_id: guide.id,
      image_file: guide.image_file,
      images_dir: join(guides_dir, 'images'),
    })),
  ]

  for (const reference of references) {
    if (typeof reference.image_file !== 'string') {
      continue
    }

    checked += 1
    const source_path = join(reference.images_dir, reference.image_file)

    if (!existsSync(source_path)) {
      missing.push({
        domain: reference.domain,
        content_id: reference.content_id,
        image_file: reference.image_file,
        source_path,
      })
    }
  }

  if (missing.length > 0) {
    throw new AssertContentImagesError({ checked, missing })
  }

  return { checked, missing }
}

async function runCli() {
  const args = process.argv.slice(2)
  const summary = await assertContentImages({
    products_dir: getOptionValue(args, '--products-dir'),
    guides_dir: getOptionValue(args, '--guides-dir'),
    links_dir: getOptionValue(args, '--links-dir'),
    taxonomies_dir: getOptionValue(args, '--taxonomies-dir'),
  })

  process.stdout.write(`Content image source files OK: ${summary.checked} checked, 0 missing\n`)
}

function getOptionValue(args: string[], option: string) {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

if (process.argv[1]?.endsWith('assert-content-images.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
