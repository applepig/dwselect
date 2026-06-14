import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import nuxt_config from '../nuxt.config'

describe('route-driven view transition contract', () => {
  it('should keep Nuxt experimental view transitions suppressed for mobile Safari safety', () => {
    // iOS Safari 的 startViewTransition 會在 hydration 視窗內 crash（useHead without context /
    // currentRenderingInstance.ce），且為 WebKit 層級 bug，手刻同樣會踩；公開站行動 Safari 受眾大，
    // 故 WebKit 修穩前刻意停用。詳見 docs/007-routed-navigation-view-transitions/works.md 決策。
    expect(nuxt_config.experimental?.viewTransition).toBe(false)
  })

  it('should not use the legacy helper for route or query state changes', () => {
    const routed_sources = [
      '../app/pages/index.vue',
      '../app/pages/guide.vue',
      '../app/pages/search.vue',
      '../app/pages/links.vue',
      '../app/pages/products/[id].vue',
      '../app/components/app-navigation.vue',
      '../app/components/product-card.vue',
    ].map((file_path) => readFileSync(new URL(file_path, import.meta.url), 'utf8')).join('\n')

    expect(routed_sources).not.toContain('runViewTransition')
    expect(routed_sources).not.toContain("from '../utils/view-transition'")
    expect(routed_sources).not.toContain("from '~/utils/view-transition'")
  })

  it('should define shared hero names, product-card groups and reduced-motion fallback CSS', () => {
    const card_source = readFileSync(new URL('../app/components/product-card.vue', import.meta.url), 'utf8')
    const detail_source = readFileSync(new URL('../app/components/product-detail.vue', import.meta.url), 'utf8')
    const catalog_css = readFileSync(new URL('../app/assets/styles/catalog.css', import.meta.url), 'utf8')

    expect(card_source).toContain('`product-image-${product.id}`')
    expect(detail_source).toContain('`product-image-${detail.id}`')
    expect(catalog_css).toContain('view-transition-class: product-card')
    expect(catalog_css).toContain('::view-transition-group(.product-card)')
    expect(catalog_css).toContain('::view-transition-old(.product-card)')
    expect(catalog_css).toContain('::view-transition-new(.product-card)')
    expect(catalog_css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(catalog_css).toContain('animation: none')
    expect(catalog_css).toContain('.compact-page-fade-enter-active')
    expect(catalog_css).toContain('.compact-page-fade-leave-active')
    expect(catalog_css).toContain('.compact-page-fade-enter-from')
  })
})
