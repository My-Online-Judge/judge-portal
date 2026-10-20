<template>
    <div ref="rootEl" class="border-t border-border bg-muted/30 px-4 py-3">
        <div v-if="!current" class="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal class="h-4 w-4 shrink-0" aria-hidden="true" />
            Submit to see your verdict here. Sample tests show their input, expected and your output.
        </div>
        <VerdictTiles v-else-if="terminal" :submission="current" />
        <div v-else class="space-y-3 text-sm">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <VerdictChip size="lg" :status="current.status" />
                <span class="text-muted-foreground">
                    {{ current.status === SubmissionResult.JUDGING ? 'Running tests' : 'In the queue' }}
                </span>
                <span class="tabular ml-auto font-mono text-xs text-muted-foreground">#{{ current.id.substring(0, 8) }}</span>
            </div>
            <GhostTiles :state="current.status === SubmissionResult.JUDGING ? 'running' : 'pending'" />
            <p v-if="current.status === SubmissionResult.JUDGING" class="text-xs text-muted-foreground">
                Results for every test arrive together when judging finishes.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, inject } from 'vue'
import { Terminal } from 'lucide-vue-next'
import VerdictChip from '@/components/common/VerdictChip.vue'
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
