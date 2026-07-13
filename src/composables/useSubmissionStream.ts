import { getCurrentInstance, onBeforeUnmount } from 'vue'
import submissionService from '@/services/submissionService'
import { API_ROUTES } from '@/constants/apiPath'
import { isTerminalStatus, type Submission } from '@/types/submission'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
const FALLBACK_TIMEOUT_MS = 20_000

type VerdictHandler = (verdict: Submission) => void

interface Watcher {
    source: EventSource
    timer: ReturnType<typeof setTimeout>
}

export function useSubmissionStream() {
    const watchers = new Map<string, Watcher>()
    const pendingFallbacks = new Set<{ cancelled: boolean }>()

    const stop = (id: string) => {
        const w = watchers.get(id)
        if (!w) return
        w.source.close()
        clearTimeout(w.timer)
        watchers.delete(id)
    }

    const stopAll = () => {
        for (const id of Array.from(watchers.keys())) stop(id)
        for (const t of pendingFallbacks) t.cancelled = true
    }

    // Idempotent: claims (closes + removes) the watcher synchronously so repeated
    // triggers (multiple 'error' events, or error racing the timeout) fetch once.
    const fallbackFetch = async (id: string, onVerdict: VerdictHandler) => {
        if (!watchers.has(id)) return
        stop(id)
        const token = { cancelled: false }
        pendingFallbacks.add(token)
        try {
            const res = await submissionService.getSubmissionById(id)
            const sub = res.data.data
            if (!token.cancelled && sub && isTerminalStatus(sub.status)) onVerdict(sub)
        } catch {
            // Nothing more we can do; leave the row as Judging.
        } finally {
            pendingFallbacks.delete(token)
        }
    }

    const watch = (id: string, onVerdict: VerdictHandler) => {
        if (watchers.has(id)) return

        const source = new EventSource(`${BASE_URL}${API_ROUTES.SUBMISSIONS.STREAM(id)}`, {
            withCredentials: true,
        })
        const timer = setTimeout(() => fallbackFetch(id, onVerdict), FALLBACK_TIMEOUT_MS)
        watchers.set(id, { source, timer })

        source.addEventListener('verdict', (ev: MessageEvent) => {
            let verdict: Submission
            try {
                verdict = JSON.parse(ev.data)
            } catch {
                fallbackFetch(id, onVerdict) // malformed payload → fetch the real value
                return
            }
            stop(id) // close BEFORE the callback so a throwing onVerdict can't leave the stream open
            onVerdict(verdict)
        })

        source.addEventListener('error', () => {
            // EventSource would auto-reconnect; we don't want that. Close and fall back once.
            fallbackFetch(id, onVerdict)
        })
    }

    // Auto-clean when used inside a component; safe to skip in a bare unit test.
    if (getCurrentInstance()) {
        onBeforeUnmount(stopAll)
    }

    return { watch, stop, stopAll }
}
