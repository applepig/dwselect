let disqus_embed_load_promise: Promise<void> | null = null

export function invalidateDisqusEmbed() {
  const script = document.querySelector<HTMLScriptElement>('script[data-disqus-embed="true"]')
  if (script !== null) {
    script.onload = null
    script.onerror = null
    script.remove()
  }
  disqus_embed_load_promise = null
}

export function loadDisqusEmbed(shortname: string, on_loaded: () => void): Promise<void> {
  const existing_script = document.querySelector<HTMLScriptElement>('script[data-disqus-embed="true"]')

  if (existing_script !== null && disqus_embed_load_promise !== null) {
    return disqus_embed_load_promise
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://${shortname}.disqus.com/embed.js`
  script.dataset.disqusEmbed = 'true'
  const load_promise = new Promise<void>((resolve, reject) => {
    script.onload = () => {
      try {
        on_loaded()
        resolve()
      }
      catch {
        reject(new Error('Disqus embed script failed to load'))
      }
    }
    script.onerror = () => {
      reject(new Error('Disqus embed script failed to load'))
    }
  })
  disqus_embed_load_promise = load_promise
  document.head.append(script)

  return load_promise
}
