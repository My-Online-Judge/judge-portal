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
    let gaveUpThisRound = false

    // Single-flight: N requests failing at once wait on one /auth/refresh.
    const refreshOnce = (): Promise<unknown> => {
        if (!inFlight) {
            gaveUpThisRound = false
            inFlight = deps.refresh().finally(() => { inFlight = null })
        }
        return inFlight
    }

    const giveUpOnce = async (): Promise<void> => {
        if (gaveUpThisRound) return
        gaveUpThisRound = true
        await deps.onGiveUp()
    }

    return async (error: AxiosError): Promise<AxiosResponse> => {
        const config = error.config as RetriableConfig | undefined
        if (error.response?.status !== 401 || !config) throw error
        if (isExcluded(config.url)) throw error

        // Already retried once: a second refresh would not help, so stop here
        // rather than ping-ponging between refresh and retry.
        if (config._retry) {
            gaveUpThisRound = true
            await deps.onGiveUp()
            throw error
        }

        config._retry = true
        try {
            await refreshOnce()
        } catch {
            await giveUpOnce()
            throw error
        }
        return deps.retry(config)
    }
}
