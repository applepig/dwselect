#!/usr/bin/env node
// Coordinator 的 content-only 驗證 gate。
// 取代手刻的 `jq empty` + 逐條 vitest：一次呼叫 `pnpm content:check` 就跑完
// JSON 合法性 + zod schema + taxonomy 參照 + published image guard。
// 這是 content JSON / taxonomy / image 變更的「唯一」驗證入口，不需要 `pnpm generate`
// （full SSG build 是慢的多餘步驟，且會和容器 dev server 共用的 .nuxt / Vite cache 相撞）。

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const CONTENT_DIRS = [
  'content/products',
  'content/guides',
  'content/links',
  'content/taxonomies',
]

const VITEST_SUITES = [
  'tests/published-products',
  'tests/content-taxonomy-references.test.ts',
  'tests/product-schema.test.ts',
  'tests/assert-content-images.test.ts',
]

function collectJsonFiles() {
  const files = []
  for (const dir of CONTENT_DIRS) {
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.json')) files.push(join(dir, name))
    }
  }
  return files
}

function validateJsonSyntax(files) {
  const broken = []
  for (const file of files) {
    try {
      JSON.parse(readFileSync(file, 'utf8'))
    }
    catch (err) {
      broken.push({ file, message: err.message })
    }
  }
  return broken
}

const jsonFiles = collectJsonFiles()
console.log(`[content-check] 檢查 ${jsonFiles.length} 個 content JSON 的語法...`)

const broken = validateJsonSyntax(jsonFiles)
if (broken.length > 0) {
  console.error(`[content-check] ❌ ${broken.length} 個 JSON 無法 parse：`)
  for (const { file, message } of broken) console.error(`  - ${file}: ${message}`)
  process.exit(1)
}
console.log('[content-check] ✓ JSON 語法 OK')

console.log('[content-check] 跑 schema / taxonomy / image guard suites...')
const result = spawnSync('pnpm', ['vitest', 'run', ...VITEST_SUITES], {
  stdio: 'inherit',
})

if (result.status !== 0) {
  console.error('[content-check] ❌ vitest content suites 失敗')
  process.exit(result.status ?? 1)
}
console.log('[content-check] ✓ 全部通過')
