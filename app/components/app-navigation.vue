<template>
  <nav
    class="compact-app-nav"
    aria-label="DW嚴選分頁"
  >
    <div class="compact-app-sidebar">
      <p class="nav-brand">
        DW嚴選
      </p>
      <div class="nav-items">
        <NuxtLink
          v-for="item in nav_items"
          :key="`sidebar-${item.id}`"
          :to="item.to"
          class="app-nav-button"
          :class="{ 'is-active': isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <UIcon
            :name="item.icon"
            class="app-nav-icon"
          />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="compact-app-rail">
      <NuxtLink
        v-for="item in nav_items"
        :key="`rail-${item.id}`"
        :to="item.to"
        class="app-nav-button"
        :class="{ 'is-active': isActive(item.to) }"
        :aria-label="item.label"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <UIcon
          :name="item.icon"
          class="app-nav-icon"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>

    <div class="compact-app-bottom-tabs">
      <NuxtLink
        v-for="item in nav_items"
        :key="`bottom-${item.id}`"
        :to="item.to"
        class="app-nav-button"
        :class="{ 'is-active': isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <UIcon
          :name="item.icon"
          class="app-nav-icon"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const nav_items = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house', to: '/' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags', to: '/guide' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search', to: '/search' },
  { id: 'links', label: '連結', icon: 'i-lucide-link', to: '/links' },
]

function isActive(path: string) {
  return route.path === path
}
</script>
