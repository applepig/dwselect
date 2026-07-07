import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'

import { emitContentSchema } from '../scripts/emit-content-schema.ts'
import { guide_schema, link_schema, product_schema } from '../app/utils/product-schema'

// Drift-guard：committed 的 content/.schema/*.json 必須與 zod SSOT 現場產出逐字相同。
// 有人改了 app/utils/product-schema.ts 卻忘了 `node scripts/emit-content-schema.ts` 時，這裡會紅，
// 逼回重產——這是「generated 產物不得與 SSOT 脫鉤」的 invariant，不是實作快照。
const cases = [
  ['product.schema.json', product_schema],
  ['guide.schema.json', guide_schema],
  ['link.schema.json', link_schema],
] as const

describe('generated content JSON Schema stays in sync with the zod SSOT', () => {
  for (const [file_name, schema] of cases) {
    it(`${file_name} matches z.toJSONSchema output`, () => {
      const committed = readFileSync(new URL(`../content/.schema/${file_name}`, import.meta.url), 'utf8')

      expect(committed).toBe(emitContentSchema(schema))
    })
  }
})
