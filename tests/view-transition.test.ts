import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import nuxt_config from '../nuxt.config'

describe('route-driven view transition contract', () => {
  it('should temporarily enable Nuxt experimental view transitions for the M3 iPad Safari spike', () => {
    // M3 只準備 spike：暫時翻回 true 讓使用者做實機 iPad Safari 驗證。
    // AC10 尚未 PASS 前不得宣稱可 ship；若 FAIL 或未驗證，merge／上線前必須 revert/維持 false。
    expect(nuxt_config.experimental?.viewTransition).toBe(true)
  })

  it('should not use the legacy helper for route or query state changes', () => {
    const routed_sources = [
      '../app/pages/index.vue',
      '../app/pages/guide/index.vue',
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
    expect(catalog_css).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*view-transition-class: product-card/)
    expect(catalog_css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(catalog_css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*view-transition-name: none !important/)
    expect(catalog_css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/)
    expect(catalog_css).toContain('.compact-page-fade-enter-active')
    expect(catalog_css).toContain('.compact-page-fade-leave-active')
    expect(catalog_css).toContain('.compact-page-fade-enter-from')
  })
})
