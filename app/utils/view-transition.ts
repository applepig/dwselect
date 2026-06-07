type MinimalViewTransitionDocument = {
  startViewTransition?: (callback: () => void) => unknown
}

type MinimalMediaQueryList = {
  matches: boolean
}

export type ViewTransitionOptions = {
  document?: MinimalViewTransitionDocument | null
  matchMedia?: ((query: string) => MinimalMediaQueryList) | null
}

export function runViewTransition(action: () => void, options: ViewTransitionOptions = {}) {
  const target_document = options.document ?? getDefaultDocument()
  const matchMedia = options.matchMedia ?? getDefaultMatchMedia()

  if (!target_document?.startViewTransition || shouldReduceMotion(matchMedia)) {
    action()
    return
  }

  target_document.startViewTransition(action)
}

function getDefaultDocument(): MinimalViewTransitionDocument | null {
  if (typeof document === 'undefined') {
    return null
  }

  return document as MinimalViewTransitionDocument
}

function getDefaultMatchMedia(): ((query: string) => MinimalMediaQueryList) | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }

  return window.matchMedia.bind(window)
}

function shouldReduceMotion(matchMedia: ((query: string) => MinimalMediaQueryList) | null) {
  return matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}
