import type { ShallowRef } from 'vue'
import type { TaxonomyKind } from '../utils/published-products/select-taxonomy-items'
import type { TaxonomyPageData } from '../utils/published-products/types'
import { TAXONOMY_KINDS } from '../utils/published-products/taxonomy-kinds'
import { buildTaxonomyPageSeo } from '../utils/published-products/taxonomy-page-seo'
import { buildSeoMeta, getCanonicalUrl, SITE_NAME, SITE_OG_IMAGE } from '../utils/seo-metadata'

// 收斂四個 taxonomy 頁（category／tag／brand／channel）逐行複製的 setup：route id 正規化（C1）、
// canonical 推導、meta computed、useHead／useSeoMeta 註冊、await fetch、404、watchEffect。
// 頁面 template 各自保留（category 頁多 CategoryChipBar＋compact-page wrapper），composable 只吞 script 共用邏輯。
// SEO 計算再收斂成單一 taxonomy_seo computed：title／description 共用同一次 buildTaxonomyPageSeo 結果與同一處 null-guard，
// 避免每次 reactive recompute 重算兩遍、兩處 guard 漂移。
export async function useTaxonomyDetailPage(kind: TaxonomyKind): Promise<{
  page_data: ShallowRef<TaxonomyPageData | null>
}> {
  const route = useRoute()
  const raw_id = route.params.id
  const taxonomy_id = (Array.isArray(raw_id) ? raw_id[0] : raw_id) ?? ''
  const page_data = shallowRef<TaxonomyPageData | null>(null)

  // canonical 由 route id 同步推導（不需等 fetch）；title／description 等 fetch 解析 label 後才有意義，
  // 未解析前以站名／站台預設 OG 圖墊底，與 detail 頁慣例一致。
  // url segment 即 kind（Nuxt 檔案路由 app/pages/{kind}/[id].vue 鎖死），canonical 一律 `/${kind}/` 衍生，
  // 不從表取 prefix（ADR-2，與 taxonomy-page-seo.ts 的 canonical 衍生同源）。
  const canonical_url = getCanonicalUrl(`/${kind}/${taxonomy_id}`)
  // SEO object 收斂成單一 computed：title／description 各自呼叫 buildTaxonomyPageSeo 會讓整包
  // 每次 recompute 算兩遍，且 null-guard 兩處各寫一次有漂移風險——這裡集中一次算、一處 guard。
  const taxonomy_seo = computed(() => page_data.value === null ? null : buildTaxonomyPageSeo(page_data.value))
  const meta_title = computed(() => taxonomy_seo.value?.title ?? SITE_NAME)
  const meta_description = computed(() => taxonomy_seo.value?.description ?? SITE_NAME)

  useHead(() => ({
    title: meta_title.value,
    link: [
      {
        key: 'canonical',
        rel: 'canonical',
        href: canonical_url,
      },
    ],
  }))

  useSeoMeta(buildSeoMeta({
    title: meta_title,
    description: meta_description,
    url: canonical_url,
    image: SITE_OG_IMAGE,
  }))

  const taxonomy_page_data = await useTaxonomyPageData(kind, taxonomy_id)

  // 三型別全空（id 不存在、或 /tag/{brand-id} 跨 namespace 直連經 isSelectorIdInNamespace 回 null）
  // → 該路由不 prerender，直接訪問須主動丟 404，對齊 products/[id].vue。
  // 404 文案從 TAXONOMY_KINDS 取，各 kind 單一真相（AC7）。
  if (taxonomy_page_data.value === null) {
    throw createError({
      statusCode: 404,
      message: TAXONOMY_KINDS[kind].notFoundMessage,
      fatal: true,
    })
  }

  watchEffect(() => {
    page_data.value = taxonomy_page_data.value
  })

  return { page_data }
}
