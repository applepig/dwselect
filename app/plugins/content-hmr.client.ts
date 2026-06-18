import { resetClientSearchIndex } from '../utils/search/client-search'

export default defineNuxtPlugin(() => {
  if (!import.meta.hot) {
    return
  }

  import.meta.hot.on('dwselect:content-updated', async () => {
    resetClientSearchIndex()
    await refreshNuxtData('public-content')
  })
})
