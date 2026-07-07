import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'

// 一次性遷移：為每個 product／guide／link JSON 種上 slug = 現有 id（ADR-4／ADR-5）。
// Why: schema .strict() 下新增必填 slug 後，所有 content JSON 必須同步具備 slug 才能通過 content:check。
// 以 line-based 插入而非 JSON.parse + stringify，是為了保留既有縮排、鍵順序與結尾換行，
// 避免遷移把整批檔案的格式 churn 掉。

const CONTENT_DIRS = ['content/products', 'content/guides', 'content/links']

export type SlugMigrationResult = {
  content: string
  changed: boolean
}

// 把 slug = id 插在 id 行之後；若 slug 已存在且 = id 則不變動（冪等）。
export function applySlugToContentJson(raw_content: string, id: string): SlugMigrationResult {
  const parsed = JSON.parse(raw_content) as Record<string, unknown>

  if (parsed.slug === id) {
    return { content: raw_content, changed: false }
  }

  const lines = raw_content.split('\n')
  const id_line_index = lines.findIndex((line) => /^\s*"id"\s*:/.test(line))

  if (id_line_index === -1) {
    throw new Error(`content JSON has no "id" key to anchor slug insertion: ${id}`)
  }

  const id_line = lines[id_line_index]
  const indent = id_line.match(/^\s*/)?.[0] ?? '  '
  const slug_line = `${indent}"slug": ${JSON.stringify(id)},`

  if (parsed.slug !== undefined) {
    const slug_line_index = lines.findIndex((line) => /^\s*"slug"\s*:/.test(line))

    lines[slug_line_index] = slug_line
  }
  else {
    lines.splice(id_line_index + 1, 0, slug_line)
  }

  return { content: lines.join('\n'), changed: true }
}

function migrateContentDir(content_dir: string): number {
  const file_names = readdirSync(content_dir).filter((file_name) => file_name.endsWith('.json'))
  let changed_count = 0

  for (const file_name of file_names) {
    const file_path = join(content_dir, file_name)
    const raw_content = readFileSync(file_path, 'utf8')
    const id = parse(file_name).name
    const result = applySlugToContentJson(raw_content, id)

    if (!result.changed) {
      continue
    }

    writeFileSync(file_path, result.content)
    changed_count += 1
  }

  console.log(`${content_dir}: ${changed_count}/${file_names.length} files updated`)

  return changed_count
}

function runMigration() {
  let total_changed = 0

  for (const content_dir of CONTENT_DIRS) {
    total_changed += migrateContentDir(content_dir)
  }

  console.log(`slug migration done: ${total_changed} files changed`)
}

const is_direct_run = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href

if (is_direct_run) {
  runMigration()
}
