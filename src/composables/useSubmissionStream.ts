import { getCurrentInstance, onBeforeUnmount } from 'vue'
import submissionService from '@/services/submissionService'
import { API_ROUTES } from '@/constants/apiPath'
import { isTerminalStatus, type Submission } from '@/types/submission'
import { API_BASE_URL } from '@/api/baseUrl'
import { refreshSession } from '@/api/axiosClient'

/** A stream that stays silent this long gives way to polling. */
export const FALLBACK_TIMEOUT_MS = 20_000
/** Waits between polls; the last one repeats. */
export const POLL_DELAYS_MS = [1000, 2000, 4000, 8000]
/** No poll is scheduled later than this after polling started. */
export const POLL_DEADLINE_MS = 600_000

type VerdictHandler = (verdict: Submission) => void

interface Watch {
    id: string
    onVerdict: VerdictHandler
    onGiveUp?: () => void
    source: EventSource | null
    /** The stream's safety timer, or the next poll. */
    timer: ReturnType<typeof setTimeout> | null
    /** The one session refresh and reconnect is used up. */
    reconnected: boolean
    polling: boolean
    pollStartedAt: number
    polls: number
    /** Finished or stopped: late events, refreshes and poll results are ignored. */
    done: boolean
}

const statusOf = (error: unknown): number | undefined =>
    (error as { response?: { status?: number } } | null)?.response?.status

export interface SubmissionStreamDeps {
    /** Renews a lapsed session before the one reconnect; the tab's shared refresh by default. */
    refresh?: () => Promise<unknown>
}

/**
 * Live verdicts: an EventSource per watched submission, with a polling fallback. A stream the server refuses on its
 * first connection (the access cookie lapsed) refreshes the session once and reconnects once. Any other failure, a
 * second refusal, 20 s of silence or an unreadable payload polls with backoff until a final verdict, a 404 or the
 * deadline. `onVerdict` runs once with the final verdict; `onGiveUp` runs once if the watch ends without one.
 */
export function useSubmissionStream(deps: SubmissionStreamDeps = {}) {
    const refresh = deps.refresh ?? refreshSession
    const watches = new Map<string, Watch>()

    const clearTimer = (w: Watch) => {
        if (w.timer !== null) clearTimeout(w.timer)
        w.timer = null
    }

    const closeSource = (w: Watch) => {
        w.source?.close()
        w.source = null
    }

    const finish = (w: Watch) => {
        w.done = true
        closeSource(w)
        clearTimer(w)
        if (watches.get(w.id) === w) watches.delete(w.id)
    }

    const giveUp = (w: Watch) => {
        finish(w)
        w.onGiveUp?.()
    }

    const scheduleNextPoll = (w: Watch) => {
        const delay = POLL_DELAYS_MS[Math.min(w.polls, POLL_DELAYS_MS.length - 1)]!
        if (Date.now() + delay - w.pollStartedAt > POLL_DEADLINE_MS) return giveUp(w)
        w.polls += 1
        w.timer = setTimeout(() => void poll(w), delay)
    }

    const poll = async (w: Watch) => {
        w.timer = null
        let sub: Submission | undefined
        try {
            sub = (await submissionService.getSubmissionById(w.id)).data.data
        } catch (error) {
            if (w.done) return
            if (statusOf(error) === 404) return giveUp(w)
            return scheduleNextPoll(w) // a network error: try again later
        }
        if (w.done) return
        if (sub && isTerminalStatus(sub.status)) {
            finish(w)
            w.onVerdict(sub)
        } else {
            scheduleNextPoll(w)
        }
    }

    // Idempotent: repeated errors, or an error racing the timer, start one poller.
    const startPolling = (w: Watch) => {
        if (w.done || w.polling) return
        closeSource(w)
        clearTimer(w)
        w.polling = true
        w.pollStartedAt = Date.now()
        scheduleNextPoll(w)
    }

    const reconnectAfterRefresh = async (w: Watch) => {
        closeSource(w)
        clearTimer(w)
        try {
            await refresh()
        } catch {
            if (!w.done) startPolling(w)
            return
        }
        if (!w.done) open(w)
    }

    const open = (w: Watch) => {
        const source = new EventSource(`${API_BASE_URL}${API_ROUTES.SUBMISSIONS.STREAM(w.id)}`, {
            withCredentials: true,
        })
        w.source = source
        w.timer = setTimeout(() => startPolling(w), FALLBACK_TIMEOUT_MS)

        source.addEventListener('verdict', (ev: MessageEvent) => {
            if (w.source !== source) return
            let verdict: Submission
            try {
                verdict = JSON.parse(ev.data)
            } catch {
                return startPolling(w) // malformed payload: fetch the real value
            }
            finish(w) // close BEFORE the callback so a throwing onVerdict can't leave the stream open
            w.onVerdict(verdict)
        })

        source.addEventListener('error', () => {
            if (w.source !== source) return
            // CLOSED means the server refused the stream, typically a 401 once the access cookie has expired.
            // Otherwise EventSource would reconnect on its own; we don't want that, so poll instead.
            if (source.readyState === EventSource.CLOSED && !w.reconnected) {
                w.reconnected = true
                void reconnectAfterRefresh(w)
            } else {
                startPolling(w)
            }
        })
    }

    const watch = (id: string, onVerdict: VerdictHandler, onGiveUp?: () => void) => {
        if (watches.has(id)) return
        const w: Watch = {
            id,
            onVerdict,
            onGiveUp,
            source: null,
            timer: null,
            reconnected: false,
            polling: false,
            pollStartedAt: 0,
            polls: 0,
            done: false,
        }
        watches.set(id, w)
        open(w)
    }

    /** Stops watching without calling either callback; an in-flight refresh or poll is ignored. */
    const stop = (id: string) => {
        const w = watches.get(id)
        if (w) finish(w)
    }

    const stopAll = () => {
        for (const w of Array.from(watches.values())) finish(w)
    }

    // Auto-clean when used inside a component; safe to skip in a bare unit test.
    if (getCurrentInstance()) {
        onBeforeUnmount(stopAll)
    }

    return { watch, stop, stopAll }
}
