<template>
  <UApp>
    <main class="error-page">
      <section class="error-card">
        <p class="error-kicker">
          DW嚴選
        </p>
        <h1 class="error-title">
          {{ error_title }}
        </h1>
        <p class="error-message">
          {{ error_message }}
        </p>
        <NuxtLink
          to="/"
          class="error-home-link"
          @click.prevent="onHomeLinkClicked"
        >
          回首頁
        </NuxtLink>
      </section>
    </main>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const is_not_found = computed(() => props.error.statusCode === 404)
const error_title = computed(() => is_not_found.value ? '找不到頁面' : '發生錯誤')
const error_message = computed(() => is_not_found.value
  ? '這個頁面可能已經下架或網址有誤，回首頁繼續逛逛 DW嚴選。'
  : '系統暫時無法完成這個請求，請稍後再試或回首頁重新開始。')

function onHomeLinkClicked() {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: var(--ui-bg);
  color: var(--ui-text);
}

.error-card {
  width: min(100%, 520px);
  padding: 32px;
  border: 1px solid var(--ui-border);
  border-radius: 24px;
  background: var(--ui-bg-elevated);
  box-shadow: var(--ui-shadow-lg);
}

.error-kicker {
  margin: 0 0 12px;
  color: var(--ui-primary);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.error-title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3rem);
  line-height: 1.1;
}

.error-message {
  margin: 16px 0 28px;
  color: var(--ui-text-muted);
  line-height: 1.8;
}

.error-home-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--ui-primary);
  color: var(--ui-bg);
  font-weight: 700;
  text-decoration: none;
}

.error-home-link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--ui-primary) 36%, transparent);
  outline-offset: 3px;
}
</style>
