import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * Auth endpoints a 401 must never trigger a refresh for: refreshing /auth/refresh
 * would recurse forever, and login/logout 401s mean "these credentials are wrong",
 * which no refresh can fix. /auth/me is deliberately NOT here — booting the app with
 * an expired access token is exactly the case this module exists for. Change-password
 * is not here either: a wrong current password is a 400 CURRENT_PASSWORD_INCORRECT from
 * the identity API, so a 401 there is an expired session and refreshes like any other.
 */
export const REFRESH_EXCLUDED_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout']

export const isRefreshExcluded = (url?: string): boolean =>
    !!url && REFRESH_EXCLUDED_PATHS.some((path) => url.includes(path))

export type RetriableConfig = AxiosRequestConfig & { _retry?: boolean }

export interface RefreshOn401Deps {
    /** Ask the API for a new access token. Resolves on success, rejects otherwise. */
    refresh: () => Promise<unknown>
    /** Re-issue the request that failed. */
    retry: (config: RetriableConfig) => Promise<AxiosResponse>
    /** Called when the session is unrecoverable: clear local auth state. */
    onGiveUp: () => void | Promise<void>
    isExcluded?: (url?: string) => boolean
}

/** One in-flight call shared by every caller; the first call after it settles calls `fn` again. */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
    let inFlight: Promise<T> | null = null
    return () => {
        if (!inFlight) {
            inFlight = fn().finally(() => { inFlight = null })
        }
        return inFlight
    }
}

/**
 * Builds an axios response-error handler that turns a 401 into
 * "refresh once, then retry the original request".
 */
export function createRefreshOn401(deps: RefreshOn401Deps) {
    const isExcluded = deps.isExcluded ?? isRefreshExcluded
    // Identity of the last round that already called onGiveUp, not a boolean:
    // a boolean flag lives at module scope and gets reset the moment the NEXT
    // round starts, so a still-awaiting waiter of the PREVIOUS (failed) round
    // could see it cleared and call onGiveUp a second time for that same
    // round. Comparing against the specific round's promise means a new
    // round starting can never affect a different round's dedupe.
    let gaveUpForRound: Promise<unknown> | null = null

    // Single-flight: N requests failing at once wait on one /auth/refresh.
    const refreshOnce = singleFlight(deps.refresh)

    return async (error: AxiosError): Promise<AxiosResponse> => {
        const config = error.config as RetriableConfig | undefined
        if (error.response?.status !== 401 || !config) throw error
        if (isExcluded(config.url)) throw error

        // Already retried once: a second refresh would not help, so stop here
        // rather than ping-ponging between refresh and retry. This request
        // already went through its own refreshOnce()/onGiveUp cycle above, so
        // there is no "round" left to dedupe against here -- it always gives
        // up, exactly once, for itself.
        if (config._retry) {
            await deps.onGiveUp()
            throw error
        }

        config._retry = true
        // Capture this round's identity before awaiting it: by the time the
        // catch below runs, the flight may already belong to a *new* round.
        const round = refreshOnce()
        try {
            await round
        } catch {
            if (gaveUpForRound !== round) {
                gaveUpForRound = round
                await deps.onGiveUp()
            }
            throw error
        }
        return deps.retry(config)
    }
}

/**
 * Access tokens last 15 minutes and the access cookie expires with them (SP12). Public endpoints answer an expired
 * caller as anonymous rather than with a 401, so a personalised public read refreshes first once the session is this old.
 */
export const SESSION_REFRESH_AFTER_MS = 14 * 60_000

// When this tab last logged in or refreshed successfully; null while unknown (a fresh page load).
let lastFreshAt: number | null = null

/** Records a successful login or refresh: the access cookie is new. */
export function markSessionFresh(): void {
    lastFreshAt = Date.now()
}

/**
 * Before a personalised read: a signed-in tab whose last login or refresh is unknown or at least 14 minutes old
 * refreshes first, through the tab's one refresh path. Never rejects. A refresh the server refuses (401) ends the
 * session exactly as the interceptor does (local logout plus the "Your session expired" toast), so the tab stops
 * re-posting a dead refresh token on every visibility change. Any other failure (network, 5xx) is transient: the read
 * goes out anyway and the next call tries again.
 */
export async function ensureFreshSession(): Promise<void> {
    // A negative age means the clock stepped back: treat it as stale.
    const age = lastFreshAt === null ? -1 : Date.now() - lastFreshAt
    if (age >= 0 && age < SESSION_REFRESH_AFTER_MS) return
    try {
        // Lazy: the store imports authService, and the client imports this module.
        const { useAuthStore } = await import('@/stores/auth')
        if (!useAuthStore().isAuthenticated) return
        const { refreshSession, giveUpSession } = await import('./axiosClient')
        try {
            await refreshSession()
        } catch (err) {
            if (isRefused(err)) await giveUpSession()
        }
    } catch {
        // Transient (a failed import or a network error): nothing to add.
    }
}

const isRefused = (err: unknown): boolean =>
    (err as { response?: { status?: number } } | null)?.response?.status === 401

/** Runs ensureFreshSession whenever the tab becomes visible again. Returns the uninstaller. */
export function installFreshSessionOnVisible(doc: Document = document): () => void {
    const onChange = () => {
        if (doc.visibilityState === 'visible') void ensureFreshSession()
    }
    doc.addEventListener('visibilitychange', onChange)
    return () => doc.removeEventListener('visibilitychange', onChange)
}
