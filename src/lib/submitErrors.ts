import { isAxiosError } from 'axios'
import { getErrorMessage } from './errorMessage'

// Seconds to wait before submitting again after the API pushed back (429 too fast, 503 judge busy,
// which carry Retry-After; the API is same-origin so the browser can read it), else null.
export function retryAfterSeconds(err: unknown, fallback: number): number | null {
    if (!isAxiosError(err)) return null
    const status = err.response?.status
    if (status !== 429 && status !== 503) return null
    const ra = Number(err.response?.headers?.['retry-after'])
    return Number.isFinite(ra) && ra > 0 ? ra : fallback
}

// Toast text for a 429/503 push-back: the server's message when it sent one, else a status-aware fallback
// (a 503 with no body is an edge/gateway/upstream outage, not the user submitting too fast).
export function busyFallbackMessage(err: unknown): string {
    const status = isAxiosError(err) ? err.response?.status : undefined
    return getErrorMessage(
        err,
        status === 503 ? 'The judge is unavailable, try again in a moment' : 'You are submitting too fast',
    )
}
