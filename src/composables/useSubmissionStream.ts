import { getCurrentInstance, onBeforeUnmount } from 'vue'
import submissionService from '@/services/submissionService'
import { API_ROUTES } from '@/constants/apiPath'
import { isTerminalStatus, type Submission } from '@/types/submission'
import { API_BASE_URL } from '@/api/baseUrl'
import { refreshSession } from '@/api/axiosClient'
import { sessionIsFresh } from '@/api/refreshSession'

/** A stream that stays silent this long gives way to polling. */
export const FALLBACK_TIMEOUT_MS = 20_000
/** Waits between polls; the last one repeats. */
export const POLL_DELAYS_MS = [1000, 2000, 4000, 8000]
/** No poll is scheduled later than this after polling started. */
export const POLL_DEADLINE_MS = 600_000

/** At most this many EventSources are open per tab; further watches poll from the start. */
export const MAX_OPEN_STREAMS = 4

type VerdictHandler = (verdict: Submission) => void

interface Subscriber {
    onVerdict: VerdictHandler
    onGiveUp?: () => void
}

interface Watch {
    id: string
    /** Everyone who asked to watch this submission; the stream and the poller are shared. */
    subs: Set<Subscriber>
    source: EventSource | null
    /** The stream's safety timer, or the next poll. */
    timer: ReturnType<typeof setTimeout> | null
    /** The one session refresh and reconnect is used up. */
    reconnected: boolean
    polling: boolean
    /** The user's own new submission: may take a stream slot from a history row. */
    priority: boolean
    pollStartedAt: number
    polls: number
    /** Finished or stopped: late events, refreshes and poll results are ignored. */
    done: boolean
}

// One shared watch per submission id for the whole tab: the backend keeps a single emitter per id, so two streams
// for one id would evict each other and leave one of them silent until its fallback fires.
const shared = new Map<string, Watch>()

/** For tests: drops every shared watch without calling a callback. */
export function resetSubmissionStreams(): void {
    for (const w of Array.from(shared.values())) {
        w.done = true
        w.source?.close()
        if (w.timer !== null) clearTimeout(w.timer)
    }
    shared.clear()
}

const openStreams = () => Array.from(shared.values()).filter((w) => w.source !== null).length

const statusOf = (error: unknown): number | undefined =>
    (error as { response?: { status?: number } } | null)?.response?.status

export interface SubmissionStreamDeps {
    /** Renews a lapsed session before the one reconnect; the tab's shared refresh by default. */
    refresh?: () => Promise<unknown>
    /** Whether the session was renewed recently enough that a refusal cannot be a lapsed cookie. */
    sessionIsFresh?: () => boolean
}

/**
 * Live verdicts: an EventSource per watched submission, with a polling fallback. A stream the server refuses on its
 * first connection, while the session may have lapsed (no refresh in the last 14 minutes), refreshes the session once
 * and reconnects once. Any other failure, a refusal on a fresh session, a
 * second refusal, 20 s of silence or an unreadable payload polls with backoff until a final verdict, a 404 or the
 * deadline. `onVerdict` runs once with the final verdict; `onGiveUp` runs once if the watch ends without one.
 */
export function useSubmissionStream(deps: SubmissionStreamDeps = {}) {
    const refresh = deps.refresh ?? refreshSession
    const isFresh = deps.sessionIsFresh ?? sessionIsFresh
    /** This caller's own subscriptions, by submission id. */
    const mine = new Map<string, { w: Watch; sub: Subscriber }>()

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
        if (shared.get(w.id) === w) shared.delete(w.id)
    }

    // Every subscriber is called even if one throws; the first error is rethrown afterwards.
    const notify = (subs: Subscriber[], call: (s: Subscriber) => void) => {
        let failure: unknown
        let failed = false
        for (const s of subs) {
            try {
                call(s)
            } catch (e) {
                if (!failed) failure = e
                failed = true
            }
        }
        if (failed) throw failure
    }

    const deliver = (w: Watch, verdict: Submission) => {
        const subs = Array.from(w.subs)
        finish(w)
        notify(subs, (s) => s.onVerdict(verdict))
    }

    const giveUp = (w: Watch) => {
        const subs = Array.from(w.subs)
        finish(w)
        notify(subs, (s) => s.onGiveUp?.())
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
            // 404: gone. 401/403: the interceptor already refreshed once and retried, so the session is over.
            const status = statusOf(error)
            if (status === 404 || status === 401 || status === 403) return giveUp(w)
            return scheduleNextPoll(w) // a network error: try again later
        }
        if (w.done) return
        if (sub && isTerminalStatus(sub.status)) {
            deliver(w, sub)
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
        if (openStreams() >= MAX_OPEN_STREAMS) {
            // Full: a priority watch moves the oldest non-priority stream to polling, anything else polls itself.
            const victim = w.priority
                ? Array.from(shared.values()).find((o) => o !== w && o.source !== null && !o.priority)
                : undefined
            if (!victim) return startPolling(w)
            startPolling(victim)
        }
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
            deliver(w, verdict) // closes BEFORE the callbacks so a throwing onVerdict can't leave the stream open
        })

        source.addEventListener('error', () => {
            if (w.source !== source) return
            // CLOSED means the server refused the stream: a 401 once the access cookie has expired, but also a full
            // stream cap (429/503), a 404 or an edge 502, which EventSource cannot tell apart. Only a session that may
            // have lapsed spends a refresh; on a fresh one the refusal is something else, so poll. Otherwise
            // EventSource would reconnect on its own; we don't want that, so poll instead.
            if (source.readyState === EventSource.CLOSED && !w.reconnected && !isFresh()) {
                w.reconnected = true
                void reconnectAfterRefresh(w)
            } else {
                startPolling(w)
            }
        })
    }

    const watch = (id: string, onVerdict: VerdictHandler, onGiveUp?: () => void, opts: { priority?: boolean } = {}) => {
        if (mine.has(id)) return
        const sub: Subscriber = {
            onVerdict: (v) => {
                mine.delete(id)
                onVerdict(v)
            },
            onGiveUp: () => {
                mine.delete(id)
                onGiveUp?.()
            },
        }
        let w = shared.get(id)
        if (w) {
            w.subs.add(sub)
        } else {
            w = {
                id,
                subs: new Set([sub]),
                source: null,
                timer: null,
                reconnected: false,
                polling: false,
                priority: !!opts.priority,
                pollStartedAt: 0,
                polls: 0,
                done: false,
            }
            shared.set(id, w)
            open(w)
        }
        mine.set(id, { w, sub })
    }

    const release = ({ w, sub }: { w: Watch; sub: Subscriber }) => {
        w.subs.delete(sub)
        if (w.subs.size === 0) finish(w)
    }

    /** Stops this caller's watch without calling its callbacks; the last subscriber out closes the shared watch. */
    const stop = (id: string) => {
        const m = mine.get(id)
        if (!m) return
        mine.delete(id)
        release(m)
    }

    const stopAll = () => {
        for (const m of Array.from(mine.values())) release(m)
        mine.clear()
    }

    // Auto-clean when used inside a component; safe to skip in a bare unit test.
    if (getCurrentInstance()) {
        onBeforeUnmount(stopAll)
    }

    return { watch, stop, stopAll }
}
