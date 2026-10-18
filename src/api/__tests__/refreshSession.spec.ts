import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosError, AxiosResponse } from 'axios'
import { createRefreshOn401, isRefreshExcluded } from '@/api/refreshSession'

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
