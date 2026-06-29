import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildGuideRoutes } from '../scripts/build-guide-routes'

function makeGuidesDir(files: Record<string, { status: string }>) {
  const dir = mkdtempSync(join(tmpdir(), 'guide-routes-'))

  for (const [file_name, payload] of Object.entries(files)) {
    writeFileSync(join(dir, file_name), JSON.stringify({ id: file_name.replace(/\.json$/, ''), ...payload }))
  }

  return dir
}

describe('buildGuideRoutes', () => {
  it('should build a /guide/:stem route for each published guide', () => {
    const dir = makeGuidesDir({
      'a.json': { status: 'published' },
      'b.json': { status: 'published' },
    })

    try {
      expect(buildGuideRoutes(dir).toSorted()).toEqual(['/guide/a', '/guide/b'])
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should exclude guides whose status is not published', () => {
    const dir = makeGuidesDir({
      'live.json': { status: 'published' },
      'draft.json': { status: 'draft' },
      'gone.json': { status: 'unpublished' },
      'old.json': { status: 'archived' },
    })

    try {
      const routes = buildGuideRoutes(dir)

      expect(routes).toEqual(['/guide/live'])
      expect(routes).not.toContain('/guide/draft')
      expect(routes).not.toContain('/guide/gone')
      expect(routes).not.toContain('/guide/old')
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should ignore non-json entries in the guides directory', () => {
    const dir = makeGuidesDir({ 'a.json': { status: 'published' } })
    writeFileSync(join(dir, 'README.md'), '# not a guide')

    try {
      expect(buildGuideRoutes(dir)).toEqual(['/guide/a'])
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should take the route stem verbatim from the date-prefixed kebab file name', () => {
    // content id 已強制 ASCII kebab（AC1c／ADR-11）；stem 取自檔名、含 date 前綴，無需 encodeURIComponent。
    const dir = makeGuidesDir({ '2026-06-02-japanese-rice-intro.json': { status: 'published' } })

    try {
      expect(buildGuideRoutes(dir)).toEqual(['/guide/2026-06-02-japanese-rice-intro'])
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
