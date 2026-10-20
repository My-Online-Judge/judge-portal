// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installChunkReload } from '../chunkReload'

type ErrorHandler = (error: unknown) => void
type Listener = (event: Event) => void

/** One page load: its own router and window, sharing the tab's sessionStorage with the other loads. */
function load(session: Map<string, string>) {
  const listeners = new Map<string, Listener[]>()
  let onError: ErrorHandler = () => {}
  const router = { onError: (h: ErrorHandler) => ((onError = h), () => {}) }
  const win = {
    location: { reload: vi.fn() },
    sessionStorage: {
      getItem: (k: string) => session.get(k) ?? null,
      setItem: (k: string, v: string) => void session.set(k, v),
    },
    addEventListener: (type: string, l: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), l]),
  }
  installChunkReload(router as never, win as never)
  const preloadError = () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    for (const l of listeners.get('vite:preloadError') ?? []) l(event)
    return event
  }
  return { reload: win.location.reload, routerError: (e: unknown) => onError(e), preloadError }
}

const chunkGone = () => new TypeError('Failed to fetch dynamically imported module: https://oj/assets/admin-abc.js')

describe('installChunkReload', () => {
  let consoleError: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  it('chunkLoadFailureReloadsOnce', () => {
    const session = new Map<string, string>()
    const first = load(session)
    first.routerError(chunkGone())
    expect(first.reload).toHaveBeenCalledTimes(1)
    expect(consoleError).not.toHaveBeenCalled()

    // The reloaded page fails the same way: no second reload in this session, the error surfaces instead.
    const second = load(session)
    const again = new TypeError('Importing a module script failed.')
    second.routerError(again)
    expect(second.reload).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(again)
  })

  it('reloads once on a preload error and lets the next one through', () => {
    const session = new Map<string, string>()
    const first = load(session)
    expect(first.preloadError().defaultPrevented).toBe(true)
    expect(first.reload).toHaveBeenCalledTimes(1)
    // The prevented import resolves to nothing, so the router fails too; the page is already reloading.
    first.routerError(new Error('Couldn\'t resolve component "default" at "/admin"'))
    expect(consoleError).not.toHaveBeenCalled()

    const second = load(session)
    expect(second.preloadError().defaultPrevented).toBe(false)
    expect(second.reload).not.toHaveBeenCalled()
  })

  it('otherRouterErrorsDoNotReload', () => {
    const { reload, routerError } = load(new Map())
    const other = new Error('Navigation guard failed')
    routerError(other)
    routerError('not an error')
    expect(reload).not.toHaveBeenCalled()
    // Registering onError silences vue-router's own logging, so these are still logged.
    expect(consoleError).toHaveBeenCalledWith(other)
    expect(consoleError).toHaveBeenCalledWith('not an error')
  })
})
