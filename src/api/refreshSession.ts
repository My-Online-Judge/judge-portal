import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * Auth endpoints a 401 must never trigger a refresh for: refreshing /auth/refresh
 * would recurse forever, and login/logout 401s mean "these credentials are wrong",
 * which no refresh can fix. /auth/me is deliberately NOT here — booting the app with
 * an expired access token is exactly the case this module exists for.
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

/**
 * Builds an axios response-error handler that turns a 401 into
 * "refresh once, then retry the original request".
 */
export function createRefreshOn401(deps: RefreshOn401Deps) {
    const isExcluded = deps.isExcluded ?? isRefreshExcluded
    let inFlight: Promise<unknown> | null = null
    // Identity of the last round that already called onGiveUp, not a boolean:
    // a boolean flag lives at module scope and gets reset the moment the NEXT
    // round starts, so a still-awaiting waiter of the PREVIOUS (failed) round
    // could see it cleared and call onGiveUp a second time for that same
    // round. Comparing against the specific round's promise means a new
    // round starting can never affect a different round's dedupe.
    let gaveUpForRound: Promise<unknown> | null = null

    // Single-flight: N requests failing at once wait on one /auth/refresh.
    const refreshOnce = (): Promise<unknown> => {
        if (!inFlight) {
            inFlight = deps.refresh().finally(() => { inFlight = null })
        }
        return inFlight
    }

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
        // catch below runs, `inFlight` may already belong to a *new* round.
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
