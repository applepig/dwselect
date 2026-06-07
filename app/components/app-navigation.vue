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
        <button
          v-for="tab in tabs"
          :key="`sidebar-${tab.id}`"
          type="button"
          class="app-nav-button"
          :class="{ 'is-active': tab.active }"
          :aria-current="tab.active ? 'page' : undefined"
          @click="onTabClicked(tab.id)"
        >
          <UIcon
            :name="tab.icon"
            class="app-nav-icon"
          />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <div class="compact-app-rail">
      <button
        v-for="tab in tabs"
        :key="`rail-${tab.id}`"
        type="button"
        class="app-nav-button"
        :class="{ 'is-active': tab.active }"
        :aria-label="tab.label"
        :aria-current="tab.active ? 'page' : undefined"
        @click="onTabClicked(tab.id)"
      >
        <UIcon
          :name="tab.icon"
          class="app-nav-icon"
        />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="compact-app-bottom-tabs">
      <button
        v-for="tab in tabs"
        :key="`bottom-${tab.id}`"
        type="button"
        class="app-nav-button"
        :class="{ 'is-active': tab.active }"
        :aria-current="tab.active ? 'page' : undefined"
        @click="onTabClicked(tab.id)"
      >
        <UIcon
          :name="tab.icon"
          class="app-nav-icon"
        />
        <span>{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { CompactAppTab, CompactAppTabId } from '../utils/published-products'

const props = defineProps<{
  tabs: CompactAppTab[]
  selectTab: (tab_id: CompactAppTabId) => void
}>()

function onTabClicked(tab_id: CompactAppTabId) {
  props.selectTab(tab_id)
}
</script>
