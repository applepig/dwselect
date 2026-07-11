<template>
  <section
    v-if="is_enabled"
    ref="thread_root"
    class="disqus-thread"
    aria-label="留言"
  >
    <h3 class="disqus-thread-title">
      留言
    </h3>

    <p
      v-if="load_failed"
      class="disqus-thread-fallback"
      role="alert"
    >
      留言載入失敗，請停用廣告攔截後再試。
    </p>

    <div
      v-else
      id="disqus_thread"
    />
  </section>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'

import { invalidateDisqusEmbed, loadDisqusEmbed } from '../utils/disqus-embed-loader'
import { getCanonicalUrl } from '../utils/seo-metadata'
import { getDisqusShortname } from '../utils/disqus-settings'

type DisqusPageConfig = {
  page: {
    url: string
    identifier: string
  }
}

type DisqusConfig = (this: DisqusPageConfig) => void

type DisqusApi = {
  reset: (options: { reload: true, config: DisqusConfig }) => void
}

type DisqusWindow = Window & {
  DISQUS?: DisqusApi
  disqus_config?: DisqusConfig
}

type ThreadOwner = {
  token: symbol
  config: DisqusConfig
}

const props = defineProps<{
  contentType: 'products' | 'guides'
  contentId: string
}>()

const route = useRoute()
const shortname = getDisqusShortname()
const is_enabled = shortname !== ''
const thread_root = ref<HTMLElement | null>(null)
const load_failed = ref(false)
const thread_key = computed(() => `${props.contentType}/${props.contentId}:${route.path}`)
let observer: IntersectionObserver | null = null
let is_in_viewport = false
let owner: ThreadOwner | null = null

function createDisqusConfig(): DisqusConfig {
  const page_url = getCanonicalUrl(route.path)
  const identifier = `${props.contentType}/${props.contentId}`

  return function configureDisqus() {
    this.page.url = page_url
    this.page.identifier = identifier
  }
}

function getDisqusWindow(): DisqusWindow {
  return window as DisqusWindow
}

function claimThreadConfig(): ThreadOwner {
  const owner = {
    token: Symbol('disqus-thread-owner'),
    config: createDisqusConfig(),
  }
  getDisqusWindow().disqus_config = owner.config

  return owner
}

function createEmbedLoadHandler() {
  const config_at_load_start = getDisqusWindow().disqus_config

  return () => {
    const disqus_window = getDisqusWindow()
    if (disqus_window.disqus_config !== config_at_load_start && disqus_window.disqus_config !== undefined && disqus_window.DISQUS !== undefined) {
      disqus_window.DISQUS.reset({ reload: true, config: disqus_window.disqus_config })
    }
  }
}

function handleThreadLoadFailure(thread_owner: ThreadOwner, embed_already_executed: boolean) {
  // embed.js 已執行過的失敗（DISQUS.reset throw）：其 iframe／listener／DISQUSWIDGETS 等全域副作用
  // 不會因移除 script tag 消失，重注入第二份 embed.js 對第三方是未知風險。只顯示 fallback，不重載 runtime。
  if (!embed_already_executed) {
    const disqus_window = getDisqusWindow()
    delete disqus_window.DISQUS
    invalidateDisqusEmbed()
  }

  if (owner?.token === thread_owner.token) {
    load_failed.value = true
  }
}

async function loadThread(thread_owner: ThreadOwner) {
  if (!is_enabled) {
    return
  }

  const target_was_removed = load_failed.value
  load_failed.value = false

  if (target_was_removed) {
    await nextTick()
  }

  // await 窗口內 owner 可能已換手（連續切頁）；滯後的 loadThread 不得再以舊 config 動作。
  if (owner?.token !== thread_owner.token) {
    return
  }

  try {
    const disqus_window = getDisqusWindow()
    if (disqus_window.DISQUS !== undefined) {
      disqus_window.DISQUS.reset({ reload: true, config: thread_owner.config })

      return
    }

    await loadDisqusEmbed(shortname, createEmbedLoadHandler())
  }
  catch {
    // embed.js 執行過 ⟺ window.DISQUS 存在：fast-path reset throw 與 loader onload 內 reset throw 皆屬此類；
    // loadDisqusEmbed 的 onerror（adblock／斷網，script 未執行）則 DISQUS 仍不存在。
    handleThreadLoadFailure(thread_owner, getDisqusWindow().DISQUS !== undefined)
  }
}

watch(thread_key, () => {
  owner = claimThreadConfig()

  if (!is_in_viewport) {
    return
  }

  void loadThread(owner)
})

onMounted(() => {
  if (!is_enabled || thread_root.value === null) {
    return
  }

  owner = claimThreadConfig()

  observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) {
      return
    }

    is_in_viewport = true
    observer?.unobserve(thread_root.value!)
    if (owner !== null) {
      void loadThread(owner)
    }
  })
  observer.observe(thread_root.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
