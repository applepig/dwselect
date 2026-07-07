#!/usr/bin/env node
// 從 zod SSOT（app/utils/product-schema.ts）產生 JSON Schema 到 content/.schema/。
// 目的：讓 content researcher 有一份「機器可讀、且保證不與 zod 脫鉤」的必填欄位真相可 jq，
// 不必在 skill markdown 手抄欄位清單（會漂移）。drift 由 tests/content-schema-artifact.test.ts 守住。
//
// Node 24 原生 strip TS types，故此 .ts 可用 `node scripts/emit-content-schema.ts` 直跑。

import { mkdirSync, writeFileSync } from 'node:fs'
import { z } from 'zod'

import { guide_schema, link_schema, product_schema } from '../app/utils/product-schema.ts'

const out_dir = new URL('../content/.schema/', import.meta.url)

const targets = [
  ['product.schema.json', product_schema],
  ['guide.schema.json', guide_schema],
  ['link.schema.json', link_schema],
] as const

export function emitContentSchema(schema: z.ZodType): string {
  // io: 'input' → 反映「寫入端」實際要提供的欄位（含 nullable、required），
  // 正是 researcher 產檔時該對照的形狀。
  return `${JSON.stringify(z.toJSONSchema(schema, { io: 'input' }), null, 2)}\n`
}

// 只在直跑時寫檔；被 drift-guard test import 時只取用 emitContentSchema，不觸發副作用。
if (import.meta.main) {
  mkdirSync(out_dir, { recursive: true })
  for (const [file_name, schema] of targets) {
    writeFileSync(new URL(file_name, out_dir), emitContentSchema(schema))
    console.log(`[emit-schema] wrote content/.schema/${file_name}`)
  }
}
