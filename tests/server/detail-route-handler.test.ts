import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { readPublicContentSource } from '../../scripts/content-reader'
import { extractContentId } from '../../app/utils/content/extract-content-id'
import { isPublished } from '../../scripts/public-content'

// 堵住 028 第一版的覆蓋漏洞（detail-route-id-resolution.test 只測「複製出來的」id 還原邏輯與原始碼字串）：
// 這裡真正 invoke route 的 default export handler，餵入 nitro 會給的 event.path，斷言整條
// decodeURIComponent(extractContentId(path)) → builder → 200/404 串接無誤。
//
// route 用 defineEventHandler／createError／setHeader 等 nitro 全域 auto-import；unit 環境沒有這些全域，
// 故先以最小 stub 注入再動態 import route（import 時會 eval defineEventHandler(...)）。
// stub 後 default export 即為原始 async handler，可直接帶 event 呼叫，真正執行 handler 主體。

type RouteError = Error & { statusCode: number, statusMessage: string }

const original_globals: Record<string, unknown> = {}
const stubbed_keys = ['defineEventHandler', 'createError', 'setHeader'] as const

beforeEach(() => {
  const global_object = globalThis as Record<string, unknown>

  for (const key of stubbed_keys) {
    original_globals[key] = global_object[key]
  }

  global_object.defineEventHandler = (handler: unknown) => handler
  global_object.createError = (input: { statusCode: number, statusMessage: string }) => {
    const error = new Error(input.statusMessage) as RouteError
    error.statusCode = input.statusCode
    error.statusMessage = input.statusMessage

    return error
  }
  global_object.setHeader = () => {}
})

afterEach(() => {
  const global_object = globalThis as Record<string, unknown>

  for (const key of stubbed_keys) {
    global_object[key] = original_globals[key]
  }
})

async function importHandler(relative_path: string) {
  const module = await import(relative_path)

  return module.default as (event: { path: string }) => Promise<{ id: string }>
}

describe('per-id product detail route handler', () => {
  it('resolves a published product id from its request path and returns that detail', async () => {
    const source = await readPublicContentSource()
    const product = source.products.find(isPublished)
    expect(product).toBeDefined()
    const id = extractContentId(product!.id)

    const handler = await importHandler('../../server/api/products/[id].json.get.ts')
    const detail = await handler({ path: `/api/products/${id}.json` })

    expect(detail.id).toBe(id)
  })

  it('throws a 404 for a product id that has no published content', async () => {
    const handler = await importHandler('../../server/api/products/[id].json.get.ts')

    await expect(handler({ path: '/api/products/does-not-exist.json' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('per-id guide detail route handler', () => {
  it('resolves a published guide id from its request path and returns that detail', async () => {
    const source = await readPublicContentSource()
    const guide = source.guides.find(isPublished)
    expect(guide).toBeDefined()
    const id = extractContentId(guide!.id)

    const handler = await importHandler('../../server/api/guides/[id].json.get.ts')
    const detail = await handler({ path: `/api/guides/${id}.json` })

    expect(detail.id).toBe(id)
  })

  it('throws a 404 for a guide id that has no published content', async () => {
    const handler = await importHandler('../../server/api/guides/[id].json.get.ts')

    await expect(handler({ path: '/api/guides/does-not-exist.json' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
