import { isAxiosError } from 'axios'
import { getErrorCode, getErrorMessage } from './errorMessage'
import { parseRetryAfter } from './retryAfter'

// Seconds to wait before submitting again after the API pushed back (429 too fast, 503 judge busy,
// which carry Retry-After; the API is same-origin so the browser can read it), else null.
export function retryAfterSeconds(err: unknown, fallback: number): number | null {
    if (!isAxiosError(err)) return null
    const status = err.response?.status
    if (status !== 429 && status !== 503) return null
    return parseRetryAfter(err.response?.headers?.['retry-after'], fallback)
}

// The submission service's answer to a contest submit outside the contest's window.
const CONTEST_NOT_RUNNING = 'CONTEST_NOT_RUNNING'
// Its message. Only for a backend from before oj-common 0.8.1, which sends no code: remove after the rollout window.
const CONTEST_NOT_RUNNING_MESSAGE = 'Contest is not running'

// True for that 400: the contest ended (or was withdrawn) while the page was open. The code decides; the message
// counts only when there is no code.
export function isContestNotRunning(err: unknown): boolean {
    if (!isAxiosError(err) || err.response?.status !== 400) return false
    const code = getErrorCode(err)
    if (code !== undefined) return code === CONTEST_NOT_RUNNING
    return getErrorMessage(err, '') === CONTEST_NOT_RUNNING_MESSAGE
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
