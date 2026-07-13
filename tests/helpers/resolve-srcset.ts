// @nuxt/image 未從 package exports 暴露 runtime；以檔案路徑深引入其 createImage，用「安裝版本」的
// getSizes 實際換算 <NuxtImg> sizes → srcset，對映線上 static generate 時同一 runtime 的候選產出。
// 讓 srcset 行為（多寬度、候選集上下界）能以自動化斷言鎖住，而非靠不存在的 generate gate。
// 注意：tests/*.ts 不在 nuxt typecheck include（僅 tests/nuxt/**），此深引入不影響 pnpm typecheck。
// @ts-expect-error 深引入 @nuxt/image runtime 檔案無型別宣告，僅測試用故抑制模組解析錯誤
import { createImage } from '../../node_modules/@nuxt/image/dist/runtime/image.js'

// 以安裝版 @nuxt/image 的預設 screens/densities 實跑 getSizes，回傳最終 sizes 字串與 srcset 候選寬度。
export function resolveSrcset(sizes: string): { sizesVal: string, widths: number[] } {
  const provider = {
    getImage(src: string, opts: { modifiers?: { width?: number } }) {
      return { url: `${src}?w=${opts.modifiers?.width ?? 'orig'}` }
    },
  }
  const $img = createImage({
    providers: { ipx: { provider, defaults: {} } },
    provider: 'ipx',
    presets: {},
    screens: { xs: 320, sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536, '2xl': 1536 },
    densities: [1, 2],
    alias: {},
    domains: [],
  })
  const { sizes: sizesVal, srcset } = $img.getSizes('/img.jpg', { sizes, modifiers: { format: 'webp', quality: 75 } })
  const widths = srcset
    .split(',')
    .map((entry: string) => Number(entry.trim().split(/\s+/)[1].replace('w', '')))
    .sort((a: number, b: number) => a - b)
  return { sizesVal, widths }
}
