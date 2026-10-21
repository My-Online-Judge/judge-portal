// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { START_LOCATION } from 'vue-router'
import { installChunkReload } from '../chunkReload'

type Location = { fullPath: string }
type ErrorHandler = (error: unknown, to: Location, from: Location) => void
type AfterHook = (to: Location, from: Location, failure?: unknown) => void
type BeforeHook = (to: Location, from: Location) => unknown
type Listener = (event: Event) => void
type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const at = (fullPath: string): Location => ({ fullPath })

/** The tab's sessionStorage, shared by every page load in it. */
const tabSession = (): SessionStore => {
  const items = new Map<string, string>()
  return {
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  }
}

/** One page load: its own router and window, sharing the tab's sessionStorage with the other loads. */
function load(session: SessionStore) {
  const listeners = new Map<string, Listener[]>()
  let onError: ErrorHandler = () => {}
  let afterEach: AfterHook = () => {}
  let beforeEach: BeforeHook = () => {}
  const router = {
    onError: (h: ErrorHandler) => ((onError = h), () => {}),
    afterEach: (h: AfterHook) => ((afterEach = h), () => {}),
    beforeEach: (h: BeforeHook) => ((beforeEach = h), () => {}),
  }
  const win = {
    location: { reload: vi.fn(), assign: vi.fn() },
    sessionStorage: session,
    addEventListener: (type: string, l: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), l]),
  }
  installChunkReload(router as never, win as never)
  const preloadError = () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    for (const l of listeners.get('vite:preloadError') ?? []) l(event)
    return event
  }
  let current: Location = START_LOCATION
  return {
    reload: win.location.reload,
    assign: win.location.assign,
    /** A navigation to `to` starts: its route chunk (and the chunk's preloads) are being fetched. */
    navigating: (to: Location) => {
      const answer = beforeEach(to, current)
      // The hook only takes note: it never blocks or redirects a navigation.
      expect(answer === undefined || answer === true).toBe(true)
    },
    /** A navigation to `to` fails with `error` (the address bar stays where it was). */
    routerError: (e: unknown, to: Location = at('/problems')) => onError(e, to, current),
    /** A navigation to `to` lands (or ends in a navigation failure such as an aborted one). */
    navigated: (to: Location, failure?: unknown) => {
      afterEach(to, current, failure)
      if (!failure) current = to
    },
    preloadError,
  }
}

const chunkGone = () => new TypeError('Failed to fetch dynamically imported module: https://oj/assets/admin-abc.js')

describe('installChunkReload', () => {
  let consoleError: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  it('chunkLoadFailureReloadsOnce', () => {
    const session = tabSession()
    const first = load(session)
    first.navigated(at('/problems'))
    first.routerError(chunkGone(), at('/admin/problems'))
    // The failed navigation left the address bar on /problems: load the page that was asked for.
    expect(first.assign).toHaveBeenCalledExactlyOnceWith('/admin/problems')
    expect(first.reload).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()

    // The reloaded page fails the same way: no second reload, the error surfaces instead. Its own first navigation
    // does not count as recovered, or a broken build would reload in a loop.
    const second = load(session)
    second.navigated(at('/problems'))
    const again = new TypeError('Importing a module script failed.')
    second.routerError(again, at('/admin/problems'))
    expect(second.assign).not.toHaveBeenCalled()
    expect(second.reload).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(again)
  })

  it('a tab left open across two deploys recovers twice', () => {
    const session = tabSession()
    const first = load(session)
    first.navigated(at('/problems'))
    first.routerError(chunkGone(), at('/problems/tong'))
    expect(first.assign).toHaveBeenCalledExactlyOnceWith('/problems/tong')

    // The new build works: once the reloaded page navigates on its own, the next deploy can reload the tab again.
    const second = load(session)
    second.navigated(at('/problems/tong'))
    second.navigated(at('/problems'))
    second.routerError(chunkGone(), at('/admin'))
    expect(second.assign).toHaveBeenCalledExactlyOnceWith('/admin')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('a navigation failure does not re-arm the reload', () => {
    const session = tabSession()
    load(session).routerError(chunkGone(), at('/admin'))

    const second = load(session)
    second.navigated(at('/admin'))
    second.navigated(at('/problems'), { type: 4 }) // aborted by a guard
    second.routerError(chunkGone(), at('/problems'))
    expect(second.assign).not.toHaveBeenCalled()
    expect(second.reload).not.toHaveBeenCalled()
  })

  it('reloads once on a preload error and lets the next one through', () => {
    const session = tabSession()
    const first = load(session)
    expect(first.preloadError().defaultPrevented).toBe(true)
    expect(first.reload).toHaveBeenCalledTimes(1)
    // The prevented import resolves to nothing, so the router fails too; the page is already reloading.
    first.routerError(new Error('Couldn\'t resolve component "default" at "/admin"'))
    expect(first.assign).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()

    const second = load(session)
    expect(second.preloadError().defaultPrevented).toBe(false)
    expect(second.reload).not.toHaveBeenCalled()
  })

  it('a preload error during a navigation loads the page that was asked for', () => {
    // In a production build every lazy route goes through Vite's preload helper, so a chunk of an older build that is
    // gone fires vite:preloadError before the router sees anything.
    const session = tabSession()
    const first = load(session)
    first.navigated(at('/problems'))
    first.navigating(at('/admin/problems'))
    expect(first.preloadError().defaultPrevented).toBe(true)
    expect(first.assign).toHaveBeenCalledExactlyOnceWith('/admin/problems')
    expect(first.reload).not.toHaveBeenCalled()
    // The prevented import resolves to nothing, so the router fails too; the page is already reloading.
    first.routerError(new Error('Couldn\'t resolve component "default" at "/admin/problems"'), at('/admin/problems'))
    expect(first.assign).toHaveBeenCalledTimes(1)
    expect(consoleError).not.toHaveBeenCalled()

    // Once, as for the router's own error: the reloaded page that fails again surfaces it.
    const second = load(session)
    second.navigating(at('/admin/problems'))
    expect(second.preloadError().defaultPrevented).toBe(false)
    expect(second.assign).not.toHaveBeenCalled()
  })

  it('a preload error after a navigation landed reloads the page it is on', () => {
    const page = load(tabSession())
    page.navigating(at('/problems'))
    page.navigated(at('/problems'))
    page.navigating(at('/problems/tong'))
    page.navigated(at('/problems/tong'))
    // A component loaded on demand inside the page, not a navigation.
    expect(page.preloadError().defaultPrevented).toBe(true)
    expect(page.reload).toHaveBeenCalledTimes(1)
    expect(page.assign).not.toHaveBeenCalled()
  })

  it('a navigation that failed is no longer pending', () => {
    const page = load(tabSession())
    page.navigated(at('/problems'))
    page.navigating(at('/admin'))
    page.routerError(new Error('Navigation guard failed'), at('/admin'))
    expect(page.preloadError().defaultPrevented).toBe(true)
    expect(page.reload).toHaveBeenCalledTimes(1)
    expect(page.assign).not.toHaveBeenCalled()
  })

  it('never reloads when sessionStorage throws', () => {
    const blocked = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    }
    const page = load({ getItem: blocked, setItem: blocked, removeItem: blocked })
    expect(() => page.navigated(at('/problems'))).not.toThrow()
    expect(() => page.navigated(at('/problems/tong'))).not.toThrow()

    const gone = chunkGone()
    page.routerError(gone, at('/admin'))
    expect(page.preloadError().defaultPrevented).toBe(false)
    expect(page.assign).not.toHaveBeenCalled()
    expect(page.reload).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(gone)
  })

  it('otherRouterErrorsDoNotReload', () => {
    const { reload, assign, routerError } = load(tabSession())
    const other = new Error('Navigation guard failed')
    routerError(other)
    routerError('not an error')
    expect(reload).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
    // Registering onError silences vue-router's own logging, so these are still logged.
    expect(consoleError).toHaveBeenCalledWith(other)
    expect(consoleError).toHaveBeenCalledWith('not an error')
  })
})
