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

declare global {
  interface Window {
    DISQUS?: DisqusApi
    disqus_config?: DisqusConfig
  }
}

let script_load_promise: Promise<void> | null = null

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

function createDisqusConfig(): DisqusConfig {
  const page_url = getCanonicalUrl(route.path)
  const identifier = `${props.contentType}/${props.contentId}`

  return function configureDisqus() {
    this.page.url = page_url
    this.page.identifier = identifier
  }
}

function loadDisqusEmbed(): Promise<void> {
  const existing_script = document.querySelector<HTMLScriptElement>('script[data-disqus-embed="true"]')

  if (existing_script !== null && script_load_promise !== null) {
    return script_load_promise
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://${shortname}.disqus.com/embed.js`
  script.dataset.disqusEmbed = 'true'
  const load_promise = new Promise<void>((resolve, reject) => {
    script.onload = () => resolve()
    script.onerror = () => {
      script_load_promise = null
      reject(new Error('Disqus embed script failed to load'))
    }
  })
  script_load_promise = load_promise
  document.head.append(script)

  return load_promise
}

async function loadThread() {
  if (!is_enabled) {
    return
  }

  const config = createDisqusConfig()

  if (window.DISQUS !== undefined) {
    window.DISQUS.reset({ reload: true, config })

    return
  }

  window.disqus_config = config

  try {
    await loadDisqusEmbed()
  }
  catch {
    load_failed.value = true
  }
}

watch(thread_key, () => {
  if (!is_in_viewport) {
    return
  }

  void loadThread()
})

onMounted(() => {
  if (!is_enabled || thread_root.value === null) {
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) {
      return
    }

    is_in_viewport = true
    observer?.unobserve(thread_root.value!)
    void loadThread()
  })
  observer.observe(thread_root.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
