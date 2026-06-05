import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOOGLE_SHEET_INDICATORS = [
  'docs.google.com/spreadsheets',
  'pub?output=tsv',
  'output=tsv',
]

const RUNTIME_PATHS = [
  'app',
  'content.config.ts',
  'nuxt.config.ts',
  '.output/public',
]

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.ts',
  '.txt',
  '.vue',
])

export interface RuntimeGoogleSheetReference {
  relative_path: string
  indicator: string
}

export function findRuntimeGoogleSheetReferences(root_path: string): RuntimeGoogleSheetReference[] {
  const file_paths = getRuntimeFilePaths(root_path)
  const references: RuntimeGoogleSheetReference[] = []

  for (const file_path of file_paths) {
    const content = readFileSync(file_path, 'utf8')
    const relative_path = toPosixPath(relative(root_path, file_path))

    for (const indicator of GOOGLE_SHEET_INDICATORS) {
      if (indicator === 'output=tsv' && content.includes('pub?output=tsv')) {
        continue
      }

      if (!content.includes(indicator)) {
        continue
      }

      references.push({
        relative_path,
        indicator,
      })
    }
  }

  return references
}

export function assertRuntimeGoogleSheetClean(root_path: string) {
  const references = findRuntimeGoogleSheetReferences(root_path)

  if (references.length === 0) {
    return
  }

  const lines = references.map((reference) => `- ${reference.relative_path}: ${reference.indicator}`)
  throw new Error([
    'Public runtime contains Google Sheets TSV references:',
    ...lines,
  ].join('\n'))
}

function getRuntimeFilePaths(root_path: string) {
  return RUNTIME_PATHS.flatMap((runtime_path) => getFilePaths(join(root_path, runtime_path)))
}

function getFilePaths(path: string): string[] {
  if (!existsSync(path)) {
    return []
  }

  const stats = statSync(path)

  if (stats.isFile()) {
    return isTextFile(path) ? [path] : []
  }

  if (!stats.isDirectory()) {
    return []
  }

  return readdirSync(path).flatMap((entry) => getFilePaths(join(path, entry)))
}

function isTextFile(path: string) {
  return TEXT_EXTENSIONS.has(extname(path))
}

function toPosixPath(path: string) {
  return path.split(sep).join('/')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assertRuntimeGoogleSheetClean(process.cwd())
}
