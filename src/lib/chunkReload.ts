import { START_LOCATION, type Router } from 'vue-router'

// nginx answers a missing file with index.html, so after a redeploy a tab that still runs the old build asks for chunks
// that are gone. The browsers word that failure differently (Chromium, Firefox, Safari).
const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

// One reload until the reloaded page has navigated on its own: if the fresh page fails the same way, the error
// surfaces instead of looping, and a tab left open across a later deploy can still recover.
const RELOADED_KEY = 'oj:chunk-reload'

type ReloadWindow = Pick<Window, 'location' | 'sessionStorage' | 'addEventListener'>

export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error && CHUNK_LOAD_ERROR.test(error.message)

/** True when a reload is available; false when it was used already or storage is unavailable (no reload then). */
function claimReload(win: ReloadWindow): boolean {
  try {
    if (win.sessionStorage.getItem(RELOADED_KEY)) return false
    win.sessionStorage.setItem(RELOADED_KEY, '1')
    return true
  } catch {
    return false
  }
}

/** This build works: the next stale-chunk failure (after a later deploy) may reload again. */
function rearmReload(win: ReloadWindow): void {
  try {
    win.sessionStorage.removeItem(RELOADED_KEY)
  } catch {
    // Storage is unavailable, so no reload was ever claimed.
  }
}

/** Reloads the page once when a lazy route or a preloaded chunk of an older build can no longer be fetched. */
export function installChunkReload(router: Pick<Router, 'onError' | 'afterEach'>, win: ReloadWindow = window): void {
  let reloading = false
  // Without a target, reload the current page.
  const reload = (target?: string) => {
    reloading = true
    if (target) win.location.assign(import.meta.env.BASE_URL.replace(/\/$/, '') + target)
    else win.location.reload()
  }

  router.onError((error, to) => {
    // The page is going away; a prevented preload error also fails the navigation that asked for it.
    if (reloading) return
    // The failed navigation left the address bar on the previous page, so load the page that was asked for.
    if (isChunkLoadError(error) && claimReload(win)) return reload(to.fullPath)
    // With any onError handler registered vue-router stops logging, so log what we leave alone.
    console.error(error)
  })
  // A navigation of this page that lands re-arms the reload. The page's first navigation does not count: a chunk of
  // this build that fails right after it (a broken deploy) would otherwise reload the tab in a loop.
  router.afterEach((_to, from, failure) => {
    if (!failure && from !== START_LOCATION) rearmReload(win)
  })
  // Vite fires this when a dynamic import or one of its preloads fails; preventing it stops the throw.
  win.addEventListener('vite:preloadError', (event) => {
    if (!claimReload(win)) return
    event.preventDefault()
    reload()
  })
}
