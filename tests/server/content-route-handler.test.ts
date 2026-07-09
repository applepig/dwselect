import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// 取代 server-content-routes.test 的 content.json／search-index.json 原始碼字串斷言（AC2b）：
// 那兩條只 grep route 檔文字，route 內部換 helper 名／調 import 就會誤紅，且證明不了 handler 真的
// 串起「readPublicContentSource → builder → payload」。這裡比照 detail-route-handler.test 的 nitro 全域
// stub＋動態 import pattern，真正 invoke handler 主體，斷言回傳 payload 的可觀測欄位。
//
// content.json／search-index.json 無 404 分支（不需 createError），故只 stub defineEventHandler／setHeader。

const original_globals: Record<string, unknown> = {}
const stubbed_keys = ['defineEventHandler', 'setHeader'] as const

beforeEach(() => {
  const global_object = globalThis as Record<string, unknown>

  for (const key of stubbed_keys) {
    original_globals[key] = global_object[key]
  }

  global_object.defineEventHandler = (handler: unknown) => handler
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

  return module.default as (event: { path?: string }) => Promise<Record<string, unknown>>
}

describe('public content.json route handler', () => {
  it('reads the Git-backed content source and returns the public content payload', async () => {
    const handler = await importHandler('../../server/api/content.json.get.ts')
    const payload = await handler({}) as {
      version: number
      products: { cards: unknown[] }
    }

    expect(payload.version).toBe(1)
    expect(payload.products.cards.length).toBeGreaterThan(0)
  })
})

describe('search-index.json route handler', () => {
  it('reads the Git-backed content source and returns the search index payload', async () => {
    const handler = await importHandler('../../server/routes/search-index.json.get.ts')
    const payload = await handler({}) as {
      version: number
      documents: unknown[]
    }

    expect(payload.version).toBe(1)
    expect(payload.documents.length).toBeGreaterThan(0)
  })
})
