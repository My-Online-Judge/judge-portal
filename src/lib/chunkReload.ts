import type { Router } from 'vue-router'

// nginx answers a missing file with index.html, so after a redeploy a tab that still runs the old build asks for chunks
// that are gone. The browsers word that failure differently (Chromium, Firefox, Safari).
const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

// One reload per tab session: if the fresh page fails the same way, the error surfaces instead of looping.
const RELOADED_KEY = 'oj:chunk-reload'

type ReloadWindow = Pick<Window, 'location' | 'sessionStorage' | 'addEventListener'>

export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error && CHUNK_LOAD_ERROR.test(error.message)

/** True once per session; false when the reload was used already or storage is unavailable (no reload then). */
function claimReload(win: ReloadWindow): boolean {
  try {
    if (win.sessionStorage.getItem(RELOADED_KEY)) return false
    win.sessionStorage.setItem(RELOADED_KEY, '1')
    return true
  } catch {
    return false
  }
}

/** Reloads the page once when a lazy route or a preloaded chunk of an older build can no longer be fetched. */
export function installChunkReload(router: Pick<Router, 'onError'>, win: ReloadWindow = window): void {
  let reloading = false
  const reload = () => {
    reloading = true
    win.location.reload()
  }

  router.onError((error) => {
    // The page is going away; a prevented preload error also fails the navigation that asked for it.
    if (reloading) return
    if (isChunkLoadError(error) && claimReload(win)) return reload()
    // With any onError handler registered vue-router stops logging, so log what we leave alone.
    console.error(error)
  })
  // Vite fires this when a dynamic import or one of its preloads fails; preventing it stops the throw.
  win.addEventListener('vite:preloadError', (event) => {
    if (!claimReload(win)) return
    event.preventDefault()
    reload()
  })
}
