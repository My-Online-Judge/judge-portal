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

    const stop = (id: string) => {
        const w = watchers.get(id)
        if (!w) return
        w.source.close()
        clearTimeout(w.timer)
        watchers.delete(id)
    }

    const stopAll = () => {
        for (const id of Array.from(watchers.keys())) stop(id)
    }

    // Idempotent: claims (closes + removes) the watcher synchronously so repeated
    // triggers (multiple 'error' events, or error racing the timeout) fetch once.
    const fallbackFetch = async (id: string, onVerdict: VerdictHandler) => {
        if (!watchers.has(id)) return
        stop(id)
        try {
            const res = await submissionService.getSubmissionById(id)
            const sub = res.data.data
            if (sub && isTerminalStatus(sub.status)) onVerdict(sub)
        } catch {
            // Nothing more we can do; leave the row as Judging.
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
            onVerdict(verdict)
            stop(id) // MUST close, or the browser reconnects and re-subscribes
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
