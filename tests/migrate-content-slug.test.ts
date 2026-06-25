import { describe, expect, it } from 'vitest'

import { applySlugToContentJson } from '../scripts/migrate-content-slug.ts'

const content_without_slug = [
  '{',
  '  "id": "2026-06-02-sample-product",',
  '  "status": "published",',
  '  "name": "商品名稱"',
  '}',
  '',
].join('\n')

describe('applySlugToContentJson', () => {
  it('should insert slug equal to id right after the id line', () => {
    const result = applySlugToContentJson(content_without_slug, '2026-06-02-sample-product')

    expect(result.changed).toBe(true)
    expect(JSON.parse(result.content).slug).toBe('2026-06-02-sample-product')
    expect(result.content.split('\n')[2]).toBe('  "slug": "2026-06-02-sample-product",')
  })

  it('should preserve 2-space indent and trailing newline when inserting slug', () => {
    const result = applySlugToContentJson(content_without_slug, '2026-06-02-sample-product')

    expect(result.content.endsWith('}\n')).toBe(true)
    expect(result.content).not.toContain('\t')
  })

  it('should be idempotent: a second pass produces identical content and reports no change', () => {
    const first_pass = applySlugToContentJson(content_without_slug, '2026-06-02-sample-product')
    const second_pass = applySlugToContentJson(first_pass.content, '2026-06-02-sample-product')

    expect(second_pass.changed).toBe(false)
    expect(second_pass.content).toBe(first_pass.content)
  })

  it('should leave slug and id equal after migration for any kebab id', () => {
    // content id 已強制 ASCII kebab（AC1c／ADR-11）；遷移只鏡射 slug=id，故只接受 kebab id 案例。
    for (const id of ['sample-link', '2026-06-02-japanese-rice-intro', '2026-01-01-edge']) {
      const raw = `{\n  "id": ${JSON.stringify(id)},\n  "status": "published"\n}\n`
      const result = applySlugToContentJson(raw, id)
      const parsed = JSON.parse(result.content)

      expect(parsed.slug).toBe(parsed.id)
      expect(parsed.slug).toBe(id)
    }
  })

  it('should rewrite a stale slug back to equal the id and report change', () => {
    const stale = '{\n  "id": "real-id",\n  "slug": "stale-slug",\n  "status": "published"\n}\n'
    const result = applySlugToContentJson(stale, 'real-id')

    expect(result.changed).toBe(true)
    expect(JSON.parse(result.content).slug).toBe('real-id')
  })
})
