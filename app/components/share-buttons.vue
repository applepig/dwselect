<template>
  <section
    class="share-section"
    aria-label="分享這一頁"
  >
    <h3 class="share-title">
      分享這一頁
    </h3>

    <div
      v-if="supports_web_share"
      class="share-actions"
    >
      <button
        type="button"
        class="share-main-button"
        @click="onShareButtonClicked"
      >
        <UIcon
          name="i-lucide-share-2"
          class="share-button-icon"
          aria-hidden="true"
        />
        分享
      </button>
    </div>

    <div
      v-else
      class="share-actions"
    >
      <a
        v-for="platform in share_platforms"
        :key="platform.id"
        class="share-platform-link"
        :data-platform="platform.id"
        :href="platform.href"
        target="_blank"
        rel="noopener noreferrer"
      >
        <UIcon
          :name="platform.icon"
          class="share-button-icon"
          aria-hidden="true"
        />
        {{ platform.label }}
      </a>

      <button
        type="button"
        class="share-copy-button"
        @click="onCopyLinkClicked"
      >
        <UIcon
          :name="copy_feedback_visible ? 'i-lucide-check' : 'i-lucide-link'"
          class="share-button-icon"
          aria-hidden="true"
        />
        {{ copy_feedback_visible ? '已複製' : '複製連結' }}
      </button>
    </div>

    <p
      v-if="copy_fallback_url !== ''"
      class="share-copy-fallback"
    >
      無法自動複製，請手動選取後複製：
      <span class="share-copy-fallback-url">{{ copy_fallback_url }}</span>
    </p>
  </section>
</template>

<script setup lang="ts">
import { getCanonicalUrl } from '../utils/seo-metadata'

const COPY_FEEDBACK_DURATION_MS = 2000

const props = defineProps<{
  title: string
}>()

const route = useRoute()
// 分享 URL 一律由 build 時烤入的 canonical host 組出（AC12）：
// 不讀 window.location，瀏覽當下的 host（preview／本機）不得洩入分享連結。
const share_url = computed(() => getCanonicalUrl(route.path))

// SSR／prerender 一律輸出平台連結 fallback 結構；navigator.share 偵測延後到 onMounted
// 才切換，避免 server 與 client 首次 render 分岔造成 hydration mismatch。
const supports_web_share = ref(false)

onMounted(() => {
  supports_web_share.value = typeof navigator.share === 'function'
})

// intent URL 模板逐字依 spec「介面/資料結構」節（ADR-036-3：平台公開穩定介面、零第三方 SDK）。
const share_platforms = computed(() => {
  const url = encodeURIComponent(share_url.value)
  const text = encodeURIComponent(props.title)

  return [
    { id: 'line', label: 'LINE', icon: 'i-simple-icons-line', href: `https://social-plugins.line.me/lineit/share?url=${url}` },
    { id: 'facebook', label: 'Facebook', icon: 'i-simple-icons-facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { id: 'x', label: 'X', icon: 'i-simple-icons-x', href: `https://twitter.com/intent/tweet?url=${url}&text=${text}` },
    { id: 'threads', label: 'Threads', icon: 'i-simple-icons-threads', href: `https://www.threads.net/intent/post?text=${text}%20${url}` },
  ]
})

async function onShareButtonClicked() {
  try {
    await navigator.share({ title: props.title, url: share_url.value })
  }
  catch (error) {
    // 使用者關閉分享面板是正常流程（AbortError），不是錯誤；其他失敗照常拋出。
    if (error instanceof Error && error.name === 'AbortError') {
      return
    }

    throw error
  }
}

const copy_feedback_visible = ref(false)
const copy_fallback_url = ref('')
let copy_reset_timer: ReturnType<typeof setTimeout> | null = null

async function onCopyLinkClicked() {
  try {
    // 非 secure context 時 navigator.clipboard 為 undefined，這裡的同步 TypeError 與
    // 權限拒絕的 rejection 走同一條 catch → 顯示可手動選取的 URL，不靜默失敗（Case 4）。
    await navigator.clipboard.writeText(share_url.value)
  }
  catch {
    copy_fallback_url.value = share_url.value

    return
  }

  copy_fallback_url.value = ''
  copy_feedback_visible.value = true

  // 回饋期間重複點擊：先取消舊計時器，讓「已複製」自最後一次點擊起算完整 2 秒。
  if (copy_reset_timer !== null) {
    clearTimeout(copy_reset_timer)
  }

  copy_reset_timer = setTimeout(() => {
    copy_feedback_visible.value = false
    copy_reset_timer = null
  }, COPY_FEEDBACK_DURATION_MS)
}

onUnmounted(() => {
  if (copy_reset_timer !== null) {
    clearTimeout(copy_reset_timer)
  }
})
</script>
