import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const guide_detail_url = new URL('../app/components/guide-detail.vue', import.meta.url)

function readGuideDetailSource() {
  return readFileSync(guide_detail_url, 'utf8')
}

describe('guide detail back navigation', () => {
  it('should resolve the router at setup top-level instead of inside the click handler', () => {
    const guide_detail_source = readGuideDetailSource()

    const script_start = guide_detail_source.indexOf('<script setup')
    const handler_start = guide_detail_source.indexOf('function onBackClicked()')
    const handler_end = guide_detail_source.indexOf('}', handler_start)
    const setup_top_level = guide_detail_source.slice(script_start, handler_start)
    const handler_body = guide_detail_source.slice(handler_start, handler_end)

    expect(setup_top_level).toContain('const router = useRouter()')
    expect(handler_body).not.toContain('useRouter(')
  })

  it('should only use router.back for same-origin browser history and fallback to the guide list', () => {
    const guide_detail_source = readGuideDetailSource()

    expect(guide_detail_source).toContain('function onBackClicked()')
    expect(guide_detail_source).toContain('import.meta.client')
    expect(guide_detail_source).toContain('window.history.length')
    expect(guide_detail_source).toContain('window.history.state')
    expect(guide_detail_source).toContain('document.referrer')
    expect(guide_detail_source).toContain('window.location.origin')
    expect(guide_detail_source).toContain('router.back()')
    expect(guide_detail_source).toContain("router.push('/guide')")
  })
})
