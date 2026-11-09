<template>
    <div ref="rootEl" class="px-4 pt-3.5 pb-4">
        <div v-if="!current" class="flex flex-col gap-1 py-2 text-sm">
            <p class="font-medium text-foreground">No result yet</p>
            <p class="text-muted-foreground">Submit your code and the verdict for each test shows here.</p>
        </div>
        <VerdictTiles v-else-if="terminal" :submission="current" />
        <div v-else-if="stalled" class="flex flex-col gap-3 text-sm" data-test="stalled">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 class="text-lg leading-snug font-semibold tracking-[-0.01em] text-foreground">No verdict yet</h3>
                <span class="tabular ml-auto font-mono text-xs text-muted-foreground">#{{ current.id.substring(0, 8) }}</span>
            </div>
            <p class="text-muted-foreground">
                The judge has not answered for a while. The verdict lands in Submissions when it does.
            </p>
            <div class="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" class="bg-card" data-test="check-submissions" @click="emit('check-submissions')">
                    Check Submissions
                </Button>
                <Button size="sm" variant="ghost" data-test="refresh" @click="refresh">Refresh</Button>
            </div>
        </div>
        <div v-else class="flex flex-col gap-3 text-sm">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 class="text-lg leading-snug font-semibold tracking-[-0.01em] text-foreground" data-test="live-title">
                    {{ running ? 'Running tests…' : 'Waiting in the queue…' }}
                </h3>
                <span v-if="judged.size" class="text-sm text-muted-foreground" data-test="live-count">
                    <b class="tabular font-semibold text-foreground">{{ judged.size }}<template v-if="ladderCount"> / {{ ladderCount }}</template></b>
                    judged
                </span>
                <span class="tabular ml-auto font-mono text-xs text-muted-foreground">#{{ current.id.substring(0, 8) }}</span>
            </div>
            <GhostTiles :state="running ? 'running' : 'pending'" :count="ladderCount ?? undefined" :judged="judged" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, inject } from 'vue'
import { Button } from '@/components/ui/button'
import { isTerminalStatus, SubmissionResult, type Submission } from '@/types/submission'
import VerdictTiles from './VerdictTiles.vue'
import GhostTiles from './GhostTiles.vue'
import submissionService from '@/services/submissionService'
import type { ToastHandle } from '@/composables/useToast'
import { useSubmissionStream, type SubmissionProgress } from '@/composables/useSubmissionStream'
import { submissionToasts, releaseSubmissionToast } from '@/lib/submissionToasts'
import { verdictToastPatch } from '@/lib/verdictToast'
import { SHOW_CONSOLE, revealConsole } from '@/lib/consoleReveal'

const props = defineProps<{
    submission?: Submission | null
    // How many tests the ladder should show before the judge says: the last verdict's count, when known.
    expectedCount?: number | null
}>()
const emit = defineEmits<{
    // Fired once a watched submission has its final verdict, so the page can refresh the problem's statistics.
    (e: 'judged', submission: Submission): void
    // The stream gave up and the reader asked for the Submissions tab.
    (e: 'check-submissions'): void
}>()

const current = ref<Submission | null>(props.submission ?? null)
const rootEl = ref<HTMLElement | null>(null)
// The page can hide this console (mobile Problem view); View asks it to show the console first.
const showConsole = inject(SHOW_CONSOLE, undefined)
const watched = new Set<string>()
// Leaving before a verdict: the "Submitted" toast must not wait forever.
onBeforeUnmount(() => watched.forEach(releaseSubmissionToast))
const { watch: watchVerdict } = useSubmissionStream()

// A fresh submission arrives from the Submit action with status PENDING. Show it
// optimistically, then subscribe to the stream and swap in the final verdict.
const terminal = computed(() => !!current.value && isTerminalStatus(current.value.status))

// --- The live ladder: what the judge has reported about the current submission so far ---
const started = ref(false)
const judged = ref(new Map<string, number>())
const total = ref<number | null>(null)
// The stream and its polling fallback both ended without a verdict.
const stalled = ref(false)
const running = computed(() => started.value || judged.value.size > 0 || current.value?.status === SubmissionResult.JUDGING)
// The judge's own count first, else the last verdict's, else the ladder's default (GhostTiles). Never fewer than judged.
const ladderCount = computed(() => {
    const known = total.value ?? props.expectedCount ?? null
    if (known === null) return judged.value.size > 12 ? judged.value.size : null
    return Math.max(known, judged.value.size)
})
const resetLadder = () => {
    started.value = false
    judged.value = new Map()
    total.value = null
    stalled.value = false
}
const onProgress = (p: SubmissionProgress) => {
    const next = new Map(judged.value)
    next.set(p.testCase, p.result)
    judged.value = next
    if (typeof p.total === 'number' && p.total > 0) total.value = p.total
}

// The stream payload may omit per-test details; fetch the full submission once in that case.
async function ensureDetails(verdict: Submission): Promise<Submission> {
    if (verdict.details !== undefined) return verdict
    try {
        const res = await submissionService.getSubmissionById(verdict.id)
        if (current.value?.id === verdict.id) current.value = res.data.data
        return res.data.data
    } catch {
        const bare = { ...verdict, details: null }
        if (current.value?.id === verdict.id) current.value = bare
        return bare
    }
}

// The Submit action left a "Submitted" toast for this submission; turn it into the verdict.
// No handle (a reload, or a submission from elsewhere) means no toast. A console that unmounted
// while the details loaded has nothing to show, so that verdict comes without View.
function announceVerdict(handle: ToastHandle | undefined, full: Submission) {
    handle?.update({
        ...verdictToastPatch(full),
        action: rootEl.value
            ? { label: 'View', onClick: () => void revealConsole(showConsole, () => rootEl.value) }
            : undefined,
    })
}

function settle(verdict: Submission) {
    const handle = submissionToasts.get(verdict.id)
    submissionToasts.delete(verdict.id)
    void ensureDetails(verdict).then((full) => announceVerdict(handle, full))
}

function follow(sub: Submission) {
    watched.add(sub.id)
    watchVerdict(
        sub.id,
        (verdict) => {
            if (current.value?.id !== sub.id) return
            current.value = verdict
            if (isTerminalStatus(verdict.status)) {
                emit('judged', verdict)
                settle(verdict)
            }
        },
        () => {
            releaseSubmissionToast(sub.id)
            if (current.value?.id === sub.id) stalled.value = true
        },
        {
            priority: true,
            onStarted: () => {
                if (current.value?.id === sub.id) started.value = true
            },
            onProgress: (p) => {
                if (current.value?.id === sub.id) onProgress(p)
            },
        },
    )
}

// Refresh after a give-up: watch the same submission again (the stream, then polling, as the first time).
const refresh = () => {
    if (!current.value) return
    stalled.value = false
    follow(current.value)
}

watch(
    () => props.submission,
    (sub) => {
        if (!sub) return
        current.value = sub
        resetLadder()
        if (isTerminalStatus(sub.status)) {
            settle(sub)
        } else {
            follow(sub)
        }
    },
    { immediate: true },
)
</script>
