<template>
  <div
    class="compact-panel category-chip-bar"
    aria-label="商品分類"
  >
    <div class="category-chip-list">
      <UButton
        v-for="chip in category_chips"
        :key="chip.id"
        :to="chip.id === 'all' ? '/' : `/category/${chip.id}`"
        class="category-chip"
        :color="chip.active ? 'primary' : 'neutral'"
        :variant="chip.active ? 'solid' : 'subtle'"
        :aria-pressed="chip.active"
      >
        <span>{{ chip.label }}</span>
        <template #trailing>
          <span class="chip-count">{{ chip.count }}</span>
        </template>
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// 共用分類 chip bar：首頁與 /category/{id} 共享同一條 pill bar（AC6），
// 自洽 route-aware（ADR-3，無 props）——chips 來自單一 payload，active 由當前路由解析。
import { getCategoryChips } from '../utils/published-products/compact-app'

const route = useRoute()
const catalog_shell_data = await useCatalogShellData()

// 首頁（path '/'）視為 active='all'；分類頁 active＝route param id。
// /category/[id] 是單段動態路由，route.params.id 恆為 string；Array.isArray 分支僅為
// 對齊 [id].vue 解析慣例的防禦性 fallback，正常路由不會走到。
const active_category_id = computed(() => {
  if (route.path === '/') {
    return 'all'
  }

  const raw_id = route.params.id
  return (Array.isArray(raw_id) ? raw_id[0] : raw_id) ?? 'all'
})

const category_chips = computed(() => getCategoryChips(
  catalog_shell_data.value?.category_chips ?? [],
  active_category_id.value,
))
</script>
