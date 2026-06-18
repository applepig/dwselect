<template>
  <section
    class="resource-list"
    :aria-label="aria_label"
  >
    <component
      :is="getRowComponent(row)"
      v-for="row in rows"
      :key="row.id"
      class="resource-row link-row"
      v-bind="getResourceRowLinkAttributes(row)"
    >
      <span
        class="resource-row-media"
        aria-hidden="true"
      >
        <NuxtImg
          v-if="hasVisibleImage(row) && isLocalImageSource(row.image_url)"
          :src="row.image_url ?? ''"
          alt=""
          class="resource-row-image"
          loading="lazy"
          format="webp"
          @error="onResourceImageError(row.id)"
        />
        <img
          v-else-if="hasVisibleImage(row)"
          :src="row.image_url ?? ''"
          alt=""
          class="resource-row-image"
          loading="lazy"
          @error="onResourceImageError(row.id)"
        >
        <UIcon
          v-else
          :name="getFallbackIcon(row)"
          class="resource-row-fallback-icon"
        />
      </span>

      <span class="resource-row-body link-row-body">
        <span class="resource-row-title link-row-title">{{ row.title }}</span>
        <span class="resource-row-subtitle link-row-subtitle">{{ row.subtitle }}</span>
        <span
          v-if="row.meta"
          class="resource-row-meta link-row-url"
        >{{ row.meta }}</span>
      </span>

      <UIcon
        :name="row.external ? 'i-lucide-external-link' : 'i-lucide-chevron-right'"
        class="resource-row-action link-row-action"
        aria-hidden="true"
      />
    </component>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { resolveComponent } from 'vue'

import type { CompactResourceRow } from '../utils/published-products/types'
import { getResourceRowLinkAttributes } from '../utils/published-products/resource-rows'

withDefaults(defineProps<{
  rows: CompactResourceRow[]
  aria_label?: string
}>(), {
  aria_label: '資源列表',
})

const failed_image_ids = ref<Set<string>>(new Set())
const nuxt_link = resolveComponent('NuxtLink')

function getRowComponent(row: CompactResourceRow): string | Component {
  return row.external ? 'a' : nuxt_link
}

function hasVisibleImage(row: CompactResourceRow): boolean {
  return row.image_url !== null && !failed_image_ids.value.has(row.id)
}

// 本地 content 圖（/products|guides/images/...）走 <NuxtImg>／IPX；外部 http 連結圖維持原生 <img>。
function isLocalImageSource(image_url: string | null): boolean {
  return image_url !== null && image_url.startsWith('/')
}

function onResourceImageError(row_id: string) {
  failed_image_ids.value = new Set([...failed_image_ids.value, row_id])
}

function getFallbackIcon(row: CompactResourceRow): string {
  if (row.icon !== null) {
    return row.icon
  }

  if (row.type === 'guide') {
    return 'i-lucide-book-open'
  }

  if (row.type === 'product') {
    return 'i-lucide-package'
  }

  return 'i-lucide-link'
}
</script>
