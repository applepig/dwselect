import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { dirname, join, parse } from 'node:path'

import { DEFAULT_PRODUCTS_DIR } from './content-reader.ts'

type ContentImageDomain = 'products' | 'guides'

export type BuildContentImagesOptions = {
  products_dir?: string
  guides_dir?: string
  public_dir?: string
  max_width?: number
  quality?: number
}

export type BuildContentImagesWarning = {
  domain: ContentImageDomain
  file_path: string
  image_file: string
  reason: string
}

export type BuildContentImagesFailure = BuildContentImagesWarning

export type BuildContentImagesSummary = {
  optimized: number
  missing: number
  failed: number
  outputs: string[]
  warnings: BuildContentImagesWarning[]
  failures: BuildContentImagesFailure[]
}

export class BuildContentImagesError extends Error {
  readonly summary: BuildContentImagesSummary

  constructor(summary: BuildContentImagesSummary) {
    super(formatBuildContentImagesSummary('Content image build failed', summary))
    this.name = 'BuildContentImagesError'
    this.summary = summary
  }
}

type ContentImageReference = {
  domain: ContentImageDomain
  file_path: string
  image_file: string
  source_path: string
  output_path: string
}

const DEFAULT_PUBLIC_DIR = 'public'
const DEFAULT_MAX_WIDTH = 1200
const DEFAULT_WEBP_QUALITY = 82
const IMAGE_FILE_PATTERN = /^[^./\\/?#"][^\\/?#"]*\.(jpg|jpeg|png|webp|gif|avif)$/

export async function buildContentImages(options: BuildContentImagesOptions = {}): Promise<BuildContentImagesSummary> {
  const products_dir = options.products_dir ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = options.guides_dir ?? join(dirname(products_dir), 'guides')
  const public_dir = options.public_dir ?? DEFAULT_PUBLIC_DIR
  const max_width = options.max_width ?? DEFAULT_MAX_WIDTH
  const quality = options.quality ?? DEFAULT_WEBP_QUALITY
  const summary: BuildContentImagesSummary = {
    optimized: 0,
    missing: 0,
    failed: 0,
    outputs: [],
    warnings: [],
    failures: [],
  }

  await Promise.all([
    resetOutputDirectory(join(public_dir, 'images', 'products')),
    resetOutputDirectory(join(public_dir, 'images', 'guides')),
  ])

  const references = await getContentImageReferences([
    { domain: 'products', content_dir: products_dir, output_dir: join(public_dir, 'images', 'products') },
    { domain: 'guides', content_dir: guides_dir, output_dir: join(public_dir, 'images', 'guides') },
  ], summary)

  if (summary.failed > 0) {
    throw new BuildContentImagesError(summary)
  }

  for (const reference of references) {
    if (!existsSync(reference.source_path)) {
      summary.missing += 1
      summary.warnings.push({
        domain: reference.domain,
        file_path: reference.file_path,
        image_file: reference.image_file,
        reason: 'source image file is missing',
      })
      continue
    }

    try {
      await sharp(reference.source_path)
        .rotate()
        .resize({
          width: max_width,
          height: max_width,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toFile(reference.output_path)

      summary.optimized += 1
      summary.outputs.push(reference.output_path)
    }
    catch (error) {
      summary.failed += 1
      summary.failures.push({
        domain: reference.domain,
        file_path: reference.file_path,
        image_file: reference.image_file,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (summary.missing > 0 || summary.failed > 0) {
    throw new BuildContentImagesError(summary)
  }

  return summary
}

function formatBuildContentImagesSummary(title: string, summary: BuildContentImagesSummary) {
  const lines = [
    title,
    `Optimized: ${summary.optimized}`,
    `Missing: ${summary.missing}`,
    `Failed: ${summary.failed}`,
  ]

  if (summary.warnings.length > 0) {
    lines.push('Missing images:')
    lines.push(...summary.warnings.map(formatBuildContentImagesIssue))
  }

  if (summary.failures.length > 0) {
    lines.push('Failed images:')
    lines.push(...summary.failures.map(formatBuildContentImagesIssue))
  }

  return lines.join('\n')
}

function formatBuildContentImagesIssue(issue: BuildContentImagesWarning) {
  return `- ${issue.file_path} (${issue.image_file}): ${issue.reason}`
}

async function resetOutputDirectory(output_dir: string) {
  await rm(output_dir, { recursive: true, force: true })
  await mkdir(output_dir, { recursive: true })
}

async function getContentImageReferences(
  domains: Array<{ domain: ContentImageDomain, content_dir: string, output_dir: string }>,
  summary: BuildContentImagesSummary,
) {
  const references: ContentImageReference[] = []
  const seen_output_references = new Map<string, ContentImageReference>()

  for (const { domain, content_dir, output_dir } of domains) {
    const entries = await readContentEntries(content_dir)

    for (const entry of entries) {
      if (entry.status !== 'published' || typeof entry.image_file !== 'string') {
        continue
      }

      if (!IMAGE_FILE_PATTERN.test(entry.image_file) || entry.image_file.includes('..')) {
        continue
      }

      const output_path = join(output_dir, `${parse(entry.image_file).name}.webp`)
      const reference = {
        domain,
        file_path: `${domain}/${entry.file_name}`,
        image_file: entry.image_file,
        source_path: join(content_dir, 'images', entry.image_file),
        output_path,
      }
      const existing_reference = seen_output_references.get(output_path)

      if (existing_reference !== undefined) {
        summary.failed += 1
        summary.failures.push({
          domain,
          file_path: reference.file_path,
          image_file: reference.image_file,
          reason: `output collision between ${existing_reference.file_path} (${existing_reference.image_file}) and ${reference.file_path} (${reference.image_file}) for ${output_path}`,
        })
        return references
      }

      seen_output_references.set(output_path, reference)
      references.push(reference)
    }
  }

  return references
}

async function readContentEntries(content_dir: string) {
  let entries

  try {
    entries = await readdir(content_dir, { withFileTypes: true })
  }
  catch (error) {
    if (error instanceof Error && (error as { code?: unknown }).code === 'ENOENT') {
      return []
    }

    throw error
  }

  const content_entries: Array<{ file_name: string, status?: unknown, image_file?: unknown }> = []

  for (const entry of entries.toSorted((left_entry, right_entry) => left_entry.name.localeCompare(right_entry.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const raw_content = await readFile(join(content_dir, entry.name), 'utf8')
    const content = JSON.parse(raw_content) as { status?: unknown, image_file?: unknown }

    content_entries.push({
      file_name: entry.name,
      status: content.status,
      image_file: content.image_file,
    })
  }

  return content_entries
}

async function runCli() {
  const args = process.argv.slice(2)
  const products_dir = getOptionValue(args, '--products-dir')
  const guides_dir = getOptionValue(args, '--guides-dir')
  const public_dir = getOptionValue(args, '--public-dir')
  const max_width = getNumberOptionValue(args, '--max-width')
  const summary = await buildContentImages({ products_dir, guides_dir, public_dir, max_width })

  process.stdout.write(`Content images written: ${public_dir ?? DEFAULT_PUBLIC_DIR}/images\n`)
  process.stdout.write(`Optimized: ${summary.optimized}\n`)
  process.stdout.write(`Missing: ${summary.missing}\n`)
  process.stdout.write(`Failed: ${summary.failed}\n`)
}

function getOptionValue(args: string[], option: string) {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

function getNumberOptionValue(args: string[], option: string) {
  const value = getOptionValue(args, option)

  if (value === undefined) {
    return undefined
  }

  return Number(value)
}

if (process.argv[1]?.endsWith('build-content-images.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
