<template>
    <div ref="rootEl" class="px-4 pt-3.5 pb-4">
        <div v-if="!current" class="flex flex-col gap-1 py-2 text-sm">
            <p class="font-medium text-foreground">No result yet</p>
            <p class="text-muted-foreground">Submit your code and the verdict for each test shows here.</p>
        </div>
        <VerdictTiles v-else-if="terminal" :submission="current" />
        <div v-else class="flex flex-col gap-3 text-sm">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 class="text-[17px] leading-snug font-semibold tracking-[-0.01em] text-foreground">
                    {{ current.status === SubmissionResult.JUDGING ? 'Running tests…' : 'Waiting in the queue…' }}
                </h3>
                <span class="tabular ml-auto text-xs text-muted-foreground">#{{ current.id.substring(0, 8) }}</span>
            </div>
            <GhostTiles :state="current.status === SubmissionResult.JUDGING ? 'running' : 'pending'" />
            <p v-if="current.status === SubmissionResult.JUDGING" class="text-xs text-muted-foreground">
                Every test's result arrives together when judging finishes.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, inject } from 'vue'
import { isTerminalStatus, SubmissionResult, type Submission } from '@/types/submission'
import VerdictTiles from './VerdictTiles.vue'
import GhostTiles from './GhostTiles.vue'
import submissionService from '@/services/submissionService'
import type { ToastHandle } from '@/composables/useToast'
import { useSubmissionStream } from '@/composables/useSubmissionStream'
import { submissionToasts, releaseSubmissionToast } from '@/lib/submissionToasts'
import { verdictToastPatch } from '@/lib/verdictToast'
import { SHOW_CONSOLE, revealConsole } from '@/lib/consoleReveal'

const props = defineProps<{ submission?: Submission | null }>()
// Fired once a watched submission has its final verdict, so the page can refresh the problem's statistics.
const emit = defineEmits<{ (e: 'judged', submission: Submission): void }>()

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

watch(
    () => props.submission,
    (sub) => {
        if (!sub) return
        current.value = sub
        if (isTerminalStatus(sub.status)) {
            settle(sub)
        } else {
            watched.add(sub.id)
            watchVerdict(
                sub.id,
                (verdict) => {
                    current.value = verdict
                    if (isTerminalStatus(verdict.status)) {
                        emit('judged', verdict)
                        settle(verdict)
                    }
                },
                () => releaseSubmissionToast(sub.id),
                { priority: true },
            )
        }
    },
    { immediate: true },
)
</script>
