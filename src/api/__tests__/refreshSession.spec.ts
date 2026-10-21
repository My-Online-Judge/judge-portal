// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createRefreshOn401, isRefreshExcluded, singleFlight } from '@/api/refreshSession'

// The signed-in state ensureFreshSession reads; the real store would pull in the whole auth flow.
const auth = vi.hoisted(() => ({ isAuthenticated: true, logout: vi.fn(() => Promise.resolve()) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

const err = (status: number | undefined, url: string, extra: Record<string, unknown> = {}) =>
    ({
        response: status === undefined ? undefined : { status },
        config: { url, ...extra },
    }) as unknown as AxiosError

const ok = { status: 200, data: 'retried' } as unknown as AxiosResponse

let refresh: ReturnType<typeof vi.fn>
let retry: ReturnType<typeof vi.fn>
let onGiveUp: ReturnType<typeof vi.fn>

const build = () => createRefreshOn401({ refresh, retry, onGiveUp })

beforeEach(() => {
    refresh = vi.fn(() => Promise.resolve())
    retry = vi.fn(() => Promise.resolve(ok))
    onGiveUp = vi.fn()
})

describe('isRefreshExcluded', () => {
    it('excludes the auth endpoints a refresh must never be attempted for', () => {
        expect(isRefreshExcluded('/auth/refresh')).toBe(true)
        expect(isRefreshExcluded('/auth/login')).toBe(true)
        expect(isRefreshExcluded('/auth/logout')).toBe(true)
    })

    it('does NOT exclude /auth/me — boot-with-expired-token is the case this feature exists for', () => {
        expect(isRefreshExcluded('/auth/me')).toBe(false)
        expect(isRefreshExcluded('/users')).toBe(false)
        expect(isRefreshExcluded(undefined)).toBe(false)
    })
})

describe('createRefreshOn401', () => {
    it('refreshes a 401 on the change-password path like any other (a wrong current password is a 400 now)', async () => {
        const handle = build()
        const original = err(401, '/users/me/password')

        await expect(handle(original)).resolves.toBe(ok)
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(retry).toHaveBeenCalledTimes(1)
        expect(isRefreshExcluded('/users/me/password')).toBe(false)
    })

    it('passes non-401 errors straight through', async () => {
        const handle = build()
        const original = err(500, '/users')

        await expect(handle(original)).rejects.toBe(original)
        expect(refresh).not.toHaveBeenCalled()
    })

    it('passes network errors (no response) straight through', async () => {
        const handle = build()
        const original = err(undefined, '/users')

        await expect(handle(original)).rejects.toBe(original)
        expect(refresh).not.toHaveBeenCalled()
    })

    it('never refreshes for the excluded auth endpoints', async () => {
        const handle = build()
        const original = err(401, '/auth/refresh')

        await expect(handle(original)).rejects.toBe(original)
        expect(refresh).not.toHaveBeenCalled()
        expect(onGiveUp).not.toHaveBeenCalled()
    })

    it('refreshes once and retries the original request', async () => {
        const handle = build()
        const original = err(401, '/users')

        await expect(handle(original)).resolves.toBe(ok)
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(retry).toHaveBeenCalledTimes(1)
        expect(retry.mock.calls[0][0]).toBe(original.config)
    })

    it('gives up instead of looping when the retried request 401s again', async () => {
        const handle = build()
        const original = err(401, '/users', { _retry: true })

        await expect(handle(original)).rejects.toBe(original)
        expect(refresh).not.toHaveBeenCalled()
        expect(onGiveUp).toHaveBeenCalledTimes(1)
    })

    it('collapses concurrent 401s into a single refresh', async () => {
        let release!: () => void
        refresh = vi.fn(() => new Promise<void>((resolve) => { release = () => resolve() }))
        const handle = build()

        const pending = [
            handle(err(401, '/users')),
            handle(err(401, '/roles')),
            handle(err(401, '/problems')),
        ]
        release()
        await Promise.all(pending)

        expect(refresh).toHaveBeenCalledTimes(1)
        expect(retry).toHaveBeenCalledTimes(3)
    })

    it('gives up once and rejects the original error when the refresh fails', async () => {
        refresh = vi.fn(() => Promise.reject(new Error('refresh token expired')))
        const handle = build()
        const original = err(401, '/users')

        await expect(handle(original)).rejects.toBe(original)
        expect(onGiveUp).toHaveBeenCalledTimes(1)
        expect(retry).not.toHaveBeenCalled()
    })

    it('gives up only once when several concurrent requests share a failed refresh', async () => {
        let reject!: () => void
        refresh = vi.fn(() => new Promise<void>((_, r) => { reject = () => r(new Error('nope')) }))
        const handle = build()

        const pending = [handle(err(401, '/users')), handle(err(401, '/roles'))]
        reject()
        await Promise.allSettled(pending)

        expect(onGiveUp).toHaveBeenCalledTimes(1)
    })

    it('scopes the give-up dedupe to its own round: a second waiter of the SAME failed round must not re-fire onGiveUp even if a new round starts while the first waiter is still inside onGiveUp — and a genuinely new failing round still gets its own call', async () => {
        // A macrotask boundary drains every pending microtask (including ones
        // scheduled *during* this flush), unlike a fixed number of
        // `await Promise.resolve()` hops, which would be one race away from
        // flaky depending on exactly how many microtask turns the promise
        // chain inside the module takes.
        const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

        let rejectRound1!: (reason: Error) => void
        let rejectRound2!: (reason: Error) => void
        refresh = vi
            .fn()
            .mockImplementationOnce(() => new Promise((_, reject) => { rejectRound1 = reject }))
            .mockImplementationOnce(() => new Promise((_, reject) => { rejectRound2 = reject }))

        let c!: Promise<AxiosResponse>
        let round2Started = false
        const releaseGiveUp: Array<() => void> = []
        onGiveUp = vi.fn(() => {
            // Mirrors the real onGiveUp: genuinely async (dynamic import of a
            // Pinia store + logout()), so it does NOT resolve immediately.
            // While round 1's onGiveUp is still pending, fire off an
            // unrelated request that also 401s -- this is exactly what
            // starts round 2 mid-flight, before every round-1 waiter has
            // finished handling round 1's failure.
            if (!round2Started) {
                round2Started = true
                c = handle(err(401, '/problems'))
            }
            return new Promise<void>((resolve) => releaseGiveUp.push(resolve))
        })

        const handle = build()

        // Two requests share round 1. `b` settles (rejects) well before it's
        // awaited below, so give it an immediate no-op catch -- otherwise
        // Node's unhandled-rejection detector fires before `Promise.allSettled`
        // gets a chance to attach its own handler.
        const a = handle(err(401, '/users'))
        const b = handle(err(401, '/roles'))
        a.catch(() => {})
        b.catch(() => {})

        rejectRound1(new Error('round1 failed'))
        await flush()

        // Round 1 had two waiters sharing the same failed round: exactly one
        // give-up, even though round 2 has already started in the meantime.
        expect(onGiveUp).toHaveBeenCalledTimes(1)

        releaseGiveUp[0]()
        await Promise.allSettled([a, b])
        expect(onGiveUp).toHaveBeenCalledTimes(1)

        // Round 2 is a genuinely new, later round -- when it fails too, it
        // must get its own give-up call rather than being swallowed by the
        // round-1 dedupe.
        rejectRound2(new Error('round2 failed'))
        await flush()
        expect(onGiveUp).toHaveBeenCalledTimes(2)

        releaseGiveUp[1]()
        await c.catch(() => {})
    })
})

describe('singleFlight', () => {
    it('shares one promise between two concurrent callers and calls fn again after it settles', async () => {
        const releases: Array<(v: string) => void> = []
        const fn = vi.fn(() => new Promise<string>((resolve) => { releases.push(resolve) }))
        const once = singleFlight(fn)

        const a = once()
        const b = once()
        expect(b).toBe(a)
        expect(fn).toHaveBeenCalledTimes(1)
        releases[0]('first')
        await expect(a).resolves.toBe('first')

        const c = once()
        expect(c).not.toBe(a)
        expect(fn).toHaveBeenCalledTimes(2)
        releases[1]('second')
        await expect(c).resolves.toBe('second')
    })

    it('a rejected call ends the flight too', async () => {
        const fn = vi.fn()
            .mockImplementationOnce(() => Promise.reject(new Error('nope')))
            .mockImplementationOnce(() => Promise.resolve('ok'))
        const once = singleFlight(fn)
        await expect(once()).rejects.toThrow('nope')
        await expect(once()).resolves.toBe('ok')
        expect(fn).toHaveBeenCalledTimes(2)
    })
})

// --- The tab's one refresh path, through the real axios client (a fake adapter answers the requests) ---

class MockEventSource {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSED = 2
    static instances: MockEventSource[] = []
    readyState = MockEventSource.CONNECTING
    listeners: Record<string, ((ev: { data?: string }) => void)[]> = {}
    constructor(public url: string) {
        MockEventSource.instances.push(this)
    }
    addEventListener(type: string, cb: (ev: { data?: string }) => void) {
        ;(this.listeners[type] ||= []).push(cb)
    }
    close() {
        this.readyState = MockEventSource.CLOSED
    }
    emit(type: string, ev: { data?: string }) {
        ;(this.listeners[type] || []).forEach((cb) => cb(ev))
    }
}

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>

const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown = {}): Promise<AxiosResponse> => {
    const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
    if (status < 400) return Promise.resolve(response)
    return Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { config, response, isAxiosError: true }))
}
const okEverything: Handler = (config) => reply(config, 200)

/** Fresh modules per test: the refresh flight and the session clock are module state. */
async function loadApp(handler: Handler) {
    vi.resetModules()
    const { default: client, refreshSession } = await import('@/api/axiosClient')
    const session = await import('@/api/refreshSession')
    const { default: authService } = await import('@/services/authService')
    const { useSubmissionStream } = await import('@/composables/useSubmissionStream')
    const requests: string[] = []
    client.defaults.adapter = (config) => {
        requests.push(`${config.method?.toUpperCase()} ${config.url}`)
        return handler(config)
    }
    const refreshes = () => requests.filter((r) => r === 'POST /auth/refresh').length
    return { client, refreshSession, session, authService, useSubmissionStream, requests, refreshes }
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('one refresh path per tab', () => {
    beforeEach(() => {
        auth.isAuthenticated = true
        MockEventSource.instances = []
        vi.stubGlobal('EventSource', MockEventSource)
    })
    afterEach(() => vi.unstubAllGlobals())

    it('streamAndInterceptorShareOneRefresh', async () => {
        let releaseRefresh!: () => void
        let problemReads = 0
        const app = await loadApp((config) => {
            if (config.url === '/auth/refresh') {
                return new Promise((resolve) => { releaseRefresh = () => resolve(reply(config, 200)) })
            }
            if (config.url === '/problems') return ++problemReads === 1 ? reply(config, 401) : reply(config, 200, { data: 'fresh' })
            return reply(config, 404)
        })
        const onVerdict = vi.fn()
        app.useSubmissionStream().watch('s1', onVerdict)

        // The access cookie lapsed: the stream is refused (CLOSED) and a concurrent read gets a 401.
        const stream = MockEventSource.instances[0]
        stream.readyState = MockEventSource.CLOSED
        stream.emit('error', {})
        const read = app.client.get('/problems')
        await tick()
        releaseRefresh()

        await expect(read).resolves.toMatchObject({ data: { data: 'fresh' } })
        await tick()
        expect(app.refreshes()).toBe(1)
        expect(MockEventSource.instances).toHaveLength(2)
        MockEventSource.instances[1].emit('verdict', { data: JSON.stringify({ id: 's1', status: 0 }) })
        expect(onVerdict).toHaveBeenCalledTimes(1)
    })

    it('aStreamRefusedOnAFreshSessionPollsWithoutSpendingARefresh', async () => {
        // A refused EventSource shows no status: on a session refreshed minutes ago it is not a lapsed cookie (a full
        // per-user stream cap, a 404, an edge 502), so it polls instead of rotating the refresh token.
        const app = await loadApp(okEverything)
        await app.refreshSession()
        expect(app.refreshes()).toBe(1)

        app.useSubmissionStream().watch('s1', () => {})
        const stream = MockEventSource.instances[0]
        stream.readyState = MockEventSource.CLOSED
        stream.emit('error', {})
        await tick()
        expect(app.refreshes()).toBe(1)
        expect(MockEventSource.instances).toHaveLength(1)
    })

    it('authService.refresh() joins the same flight', async () => {
        let releaseRefresh!: () => void
        const app = await loadApp((config) =>
            new Promise((resolve) => { releaseRefresh = () => resolve(reply(config, 200)) }))
        const fromInterceptorPath = app.refreshSession()
        const fromService = app.authService.refresh()
        expect(fromService).toBe(fromInterceptorPath)
        await tick()
        releaseRefresh()
        await Promise.all([fromInterceptorPath, fromService])
        expect(app.refreshes()).toBe(1)
    })
})

describe('ensureFreshSession', () => {
    const MINUTE = 60_000

    beforeEach(() => {
        auth.isAuthenticated = true
        auth.logout.mockClear()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-20T08:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('exports the 14-minute threshold', async () => {
        const app = await loadApp(okEverything)
        expect(app.session.SESSION_REFRESH_AFTER_MS).toBe(14 * MINUTE)
    })

    it('sessionIsFreshForUnder14MinutesAfterARefresh', async () => {
        const app = await loadApp(okEverything)
        expect(app.session.sessionIsFresh()).toBe(false)
        await app.refreshSession()
        expect(app.session.sessionIsFresh()).toBe(true)
        vi.setSystemTime(Date.now() + 14 * MINUTE - 1)
        expect(app.session.sessionIsFresh()).toBe(true)
        vi.setSystemTime(Date.now() + 1)
        expect(app.session.sessionIsFresh()).toBe(false)
    })

    it('refreshes first when the last login or refresh is unknown', async () => {
        const app = await loadApp(okEverything)
        await app.session.ensureFreshSession()
        expect(app.requests).toEqual(['POST /auth/refresh'])
    })

    it('skips the refresh under 14 minutes after one and refreshes at 14 minutes', async () => {
        let first = true
        const app = await loadApp((config) => {
            // The first refresh comes from the interceptor: a 401 on a protected read.
            if (config.url === '/users/me' && first) {
                first = false
                return reply(config, 401)
            }
            return reply(config, 200)
        })
        await app.client.get('/users/me')
        expect(app.refreshes()).toBe(1)

        vi.setSystemTime(Date.now() + 14 * MINUTE - 1)
        await app.session.ensureFreshSession()
        expect(app.refreshes()).toBe(1)

        vi.setSystemTime(Date.now() + 1)
        await app.session.ensureFreshSession()
        expect(app.refreshes()).toBe(2)
    })

    it('counts a password login as fresh', async () => {
        const app = await loadApp(okEverything)
        await app.authService.login('admin', 'secret')
        vi.setSystemTime(Date.now() + 13 * MINUTE)
        await app.session.ensureFreshSession()
        expect(app.requests).toEqual(['POST /auth/login'])
    })

    it('does nothing for a signed-out tab', async () => {
        auth.isAuthenticated = false
        const app = await loadApp(okEverything)
        await app.session.ensureFreshSession()
        expect(app.requests).toEqual([])
    })

    it('a refused refresh (401) ends the session like the interceptor does and still resolves', async () => {
        const app = await loadApp((config) => reply(config, config.url === '/auth/refresh' ? 401 : 200))
        const { useToast } = await import('@/composables/useToast')
        await expect(app.session.ensureFreshSession()).resolves.toBeUndefined()
        expect(auth.logout).toHaveBeenCalledTimes(1)
        expect(auth.logout).toHaveBeenCalledWith({ reload: false, notifyServer: false })
        const titles = useToast().toasts.value.map((t) => t.title)
        expect(titles).toContain('Your session expired')
    })

    it('a network error on the refresh is transient: no logout, and the next call tries again', async () => {
        const app = await loadApp((config) =>
            config.url === '/auth/refresh'
                ? Promise.reject(Object.assign(new Error('Network Error'), { config, isAxiosError: true }))
                : reply(config, 200))
        await expect(app.session.ensureFreshSession()).resolves.toBeUndefined()
        await app.session.ensureFreshSession()
        expect(app.refreshes()).toBe(2)
        expect(auth.logout).not.toHaveBeenCalled()
    })

    it('shares the in-flight refresh', async () => {
        let releaseRefresh!: () => void
        const app = await loadApp((config) =>
            new Promise((resolve) => { releaseRefresh = () => resolve(reply(config, 200)) }))
        const both = Promise.all([app.session.ensureFreshSession(), app.session.ensureFreshSession(), app.refreshSession()])
        await vi.waitFor(() => expect(app.refreshes()).toBe(1))
        releaseRefresh()
        await both
        expect(app.refreshes()).toBe(1)
    })

    it('runs when the tab becomes visible', async () => {
        let visibility: DocumentVisibilityState = 'visible'
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
        const app = await loadApp(okEverything)
        const uninstall = app.session.installFreshSessionOnVisible(document)
        try {
            visibility = 'hidden'
            document.dispatchEvent(new Event('visibilitychange'))
            await tick()
            await tick()
            expect(app.refreshes()).toBe(0)

            visibility = 'visible'
            document.dispatchEvent(new Event('visibilitychange'))
            await vi.waitFor(() => expect(app.refreshes()).toBe(1))

            // Uninstalled: a stale session no longer refreshes on visibility.
            uninstall()
            vi.setSystemTime(Date.now() + 15 * MINUTE)
            document.dispatchEvent(new Event('visibilitychange'))
            await tick()
            await tick()
            expect(app.refreshes()).toBe(1)
        } finally {
            uninstall()
            Reflect.deleteProperty(document, 'visibilityState')
        }
    })
})
