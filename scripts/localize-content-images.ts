import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

const DEFAULT_PRODUCTS_DIR = 'content/products'
const DEFAULT_GUIDES_DIR = 'content/guides'
const DEFAULT_TIMEOUT_MS = 15000
const MAX_RECOMMENDED_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set(Object.values(CONTENT_TYPE_TO_EXTENSION))

export type LocalizedImageSummary = {
  localized: number
  skipped: number
  failed: number
  failures: Array<{
    file_path: string
    image_url: string
    reason: string
  }>
  warnings: Array<{
    file_path: string
    image_url: string
    reason: string
    size_bytes: number
  }>
}

type LocalizeContentImagesOptions = {
  products_dir?: string
  guides_dir?: string
  timeout_ms?: number
  dry_run?: boolean
  fetcher?: (url: string, init: RequestInit) => Promise<Response>
}

type LocalizeEntry = {
  id: string
  file_path: string
  file_name: string
  domain: 'products' | 'guides'
  image_url: unknown
}

export async function localizeContentImages(options: LocalizeContentImagesOptions = {}): Promise<LocalizedImageSummary> {
  const products_dir = options.products_dir ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = options.guides_dir ?? DEFAULT_GUIDES_DIR
  const timeout_ms = options.timeout_ms ?? DEFAULT_TIMEOUT_MS
  const dry_run = options.dry_run ?? false
  const fetcher = options.fetcher ?? globalThis.fetch

  const products_summary = await localizeContentDirectory('products', products_dir, timeout_ms, dry_run, fetcher)
  const guides_summary = await localizeContentDirectory('guides', guides_dir, timeout_ms, dry_run, fetcher)

  return {
    localized: products_summary.localized + guides_summary.localized,
    skipped: products_summary.skipped + guides_summary.skipped,
    failed: products_summary.failed + guides_summary.failed,
    failures: [...products_summary.failures, ...guides_summary.failures],
    warnings: [...products_summary.warnings, ...guides_summary.warnings],
  }
}

async function localizeContentDirectory(
  domain: 'products' | 'guides',
  content_dir: string,
  timeout_ms: number,
  dry_run: boolean,
  fetcher: (url: string, init: RequestInit) => Promise<Response>,
): Promise<LocalizedImageSummary> {
  const entries = await readContentEntries(content_dir, domain)
  if (entries.length === 0) {
    return { localized: 0, skipped: 0, failed: 0, failures: [], warnings: [] }
  }

  let localized = 0
  let skipped = 0
  let failed = 0
  const failures: LocalizedImageSummary['failures'] = []
  const warnings: LocalizedImageSummary['warnings'] = []

  const output_dir = join(content_dir, 'images')

  for (const entry of entries) {
    const result = await localizeContentEntry({
      ...entry,
      domain,
      output_dir,
      timeout_ms,
      dry_run,
      fetcher,
    })

    if (result.status === 'localized') {
      localized += 1

      if (result.warning !== undefined) {
        warnings.push({
          file_path: `${domain}/${entry.file_name}`,
          image_url: result.warning.image_url,
          reason: result.warning.reason,
          size_bytes: result.warning.size_bytes,
        })
      }

      continue
    }

    if (result.status === 'skipped') {
      skipped += 1
      continue
    }

    failed += 1
    failures.push({
      file_path: `${domain}/${entry.file_name}`,
      image_url: result.image_url,
      reason: result.reason,
    })
  }

  return { localized, skipped, failed, failures, warnings }
}

async function localizeContentEntry(params: {
  id: string
  file_path: string
  file_name: string
  domain: 'products' | 'guides'
  image_url: unknown
  output_dir: string
  timeout_ms: number
  dry_run: boolean
  fetcher: (url: string, init: RequestInit) => Promise<Response>
}): Promise<
  | { status: 'localized', warning?: { image_url: string, reason: string, size_bytes: number } }
  | { status: 'skipped' }
  | { status: 'failed', image_url: string, reason: string }
> {
  if (params.image_url === null || params.image_url === undefined) {
    return { status: 'skipped' }
  }

  if (typeof params.image_url !== 'string' || params.image_url.trim() === '') {
    return { status: 'failed', image_url: String(params.image_url), reason: 'missing or non-string image_url' }
  }

  if (params.image_url.startsWith('/images/')) {
    return { status: 'skipped' }
  }

  if (!isHttpUrl(params.image_url)) {
    return { status: 'failed', image_url: params.image_url, reason: 'non HTTP(S) image URL' }
  }

  const content = await readAndParseContent(params.file_path)

  const downloaded_image = await downloadImage(params.image_url, params.timeout_ms, params.fetcher)
  if (downloaded_image.response === null) {
    return { status: 'failed', image_url: params.image_url, reason: downloaded_image.reason ?? 'download error' }
  }

  const { response } = downloaded_image

  if (!response.ok) {
    return { status: 'failed', image_url: params.image_url, reason: `HTTP ${response.status}` }
  }

  const content_type = response.headers.get('content-type')
  const extension = getImageExtension(params.image_url, content_type)

  if (extension === null) {
    const normalized_content_type = content_type ?? '(missing)'
    return {
      status: 'failed',
      image_url: params.image_url,
      reason: `unsupported content-type (${normalized_content_type}) or image extension`,
    }
  }

  const image_url = `/images/${params.domain}/${params.id}.${extension}`
  const output_path = join(params.output_dir, `${params.id}.${extension}`)
  const image_data = Buffer.from(await response.arrayBuffer())
  const warning = image_data.byteLength > MAX_RECOMMENDED_IMAGE_SIZE_BYTES
    ? {
      image_url: params.image_url,
      reason: 'image larger than 2 MB',
      size_bytes: image_data.byteLength,
    }
    : undefined

  if (!params.dry_run) {
    await mkdir(params.output_dir, { recursive: true })
    await writeFile(output_path, image_data)

    content.image_url = image_url
    await writeFile(params.file_path, `${JSON.stringify(content, null, 2)}\n`)
  }

  return { status: 'localized', warning }
}

async function downloadImage(
  image_url: string,
  timeout_ms: number,
  fetcher: (url: string, init: RequestInit) => Promise<Response>,
): Promise<{ response: Response | null, reason?: string }> {
  const abort_controller = new AbortController()
  const timer = setTimeout(() => {
    abort_controller.abort()
  }, timeout_ms)

  try {
    const response = await fetcher(image_url, {
      headers: {
        'user-agent': BROWSER_USER_AGENT,
      },
      signal: abort_controller.signal,
    })

    return { response }
  }
  catch (error) {
    if (isAbortError(error)) {
      return { response: null, reason: `timeout after ${timeout_ms}ms` }
    }

    const message = error instanceof Error ? error.message : 'download error'
    return { response: null, reason: message }
  }
  finally {
    clearTimeout(timer)
  }
}

function getImageExtension(image_url: string, content_type: string | null): string | null {
  const normalized_content_type = content_type?.split(';')[0]?.trim().toLowerCase() ?? ''
  const mapped_extension = CONTENT_TYPE_TO_EXTENSION[normalized_content_type]

  if (mapped_extension !== undefined) {
    return mapped_extension
  }

  if (!normalized_content_type.startsWith('image/')) {
    return null
  }

  const extension = getImageUrlExtension(image_url)

  if (extension === null) {
    return null
  }

  return SUPPORTED_IMAGE_EXTENSIONS.has(extension) ? extension : null
}

function getImageUrlExtension(image_url: string): string | null {
  try {
    const pathname = new URL(image_url).pathname
    const extension = parse(pathname).ext.slice(1).toLowerCase()

    if (extension === '') {
      return null
    }

    return extension === 'jpeg' ? 'jpg' : extension
  }
  catch {
    return null
  }
}

async function readContentEntries(content_dir: string, domain: 'products' | 'guides'): Promise<LocalizeEntry[]> {
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

  const content_entries: LocalizeEntry[] = []

  for (const entry of entries.toSorted((left_entry, right_entry) => left_entry.name.localeCompare(right_entry.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const file_name = entry.name
    const file_path = join(content_dir, file_name)
    const content = await readAndParseContent(file_path)

    content_entries.push({
      id: parse(file_name).name,
      file_name,
      file_path,
      domain,
      image_url: content.image_url,
    })
  }

  return content_entries
}

async function readAndParseContent(file_path: string) {
  return JSON.parse(await readFile(file_path, 'utf8')) as { image_url?: unknown }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && (error as { code?: unknown }).code === 'ENOENT'
}

async function runCli() {
  const args = process.argv.slice(2)
  const timeout_arg = getOptionValue(args, '--timeout')
  const parsed_timeout = timeout_arg === undefined ? DEFAULT_TIMEOUT_MS : Number.parseInt(timeout_arg, 10)
  const options = {
    products_dir: getOptionValue(args, '--products-dir') ?? DEFAULT_PRODUCTS_DIR,
    guides_dir: getOptionValue(args, '--guides-dir') ?? DEFAULT_GUIDES_DIR,
    timeout_ms: Number.isNaN(parsed_timeout) ? DEFAULT_TIMEOUT_MS : parsed_timeout,
    dry_run: args.includes('--dry-run'),
  }

  const summary = await localizeContentImages(options)

  process.stdout.write(`localized: ${summary.localized}\n`)
  process.stdout.write(`skipped (already local): ${summary.skipped}\n`)
  process.stdout.write(`failed: ${summary.failed}\n`)
  process.stdout.write(`warnings: ${summary.warnings.length}\n`)

  for (const failure of summary.failures) {
    process.stdout.write(`  - ${failure.file_path}: ${failure.image_url} (${failure.reason})\n`)
  }

  for (const warning of summary.warnings) {
    process.stdout.write(`  - ${warning.file_path}: ${warning.image_url} (${warning.reason}; ${warning.size_bytes} bytes)\n`)
  }
}

function getOptionValue(args: string[], option: string) {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

if (process.argv[1]?.endsWith('localize-content-images.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}

export function getImageTargetPath(id: string, domain: 'products' | 'guides', extension: string) {
  return `/images/${domain}/${id}.${extension}`
}

export function getImageFileName(id: string, extension: string) {
  return `${id}.${extension}`
}

export { getImageExtension, getImageUrlExtension }
