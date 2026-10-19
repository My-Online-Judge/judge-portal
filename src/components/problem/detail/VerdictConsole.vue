<template>
    <div class="border-t border-border bg-muted/30 px-4 py-3">
        <div v-if="!current" class="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal class="h-4 w-4" />
            Submit your code to see the verdict here.
        </div>
        <VerdictTiles v-else-if="terminal" :submission="current" />
        <div v-else class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verdict</span>
            <Badge :class="view.chipClass">
                <Loader2 class="mr-1 inline h-3 w-3 animate-spin" />
                {{ view.label }}
            </Badge>
            <span class="tabular text-muted-foreground">#{{ current.id.substring(0, 8) }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2, Terminal } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { STATUS_CHIP_BASE } from '@/lib/submissionDisplay'
import { isTerminalStatus, type Submission } from '@/types/submission'
import VerdictTiles from './VerdictTiles.vue'
import submissionService from '@/services/submissionService'
import { useSubmissionStream } from '@/composables/useSubmissionStream'

const props = defineProps<{ submission?: Submission | null }>()
// Fired once a watched submission has its final verdict, so the page can refresh the problem's statistics.
const emit = defineEmits<{ (e: 'judged', submission: Submission): void }>()

const current = ref<Submission | null>(props.submission ?? null)
const { watch: watchVerdict } = useSubmissionStream()

// A fresh submission arrives from the Submit action with status PENDING. Show it
// optimistically, then subscribe to the stream and swap in the final verdict.
const terminal = computed(() => !!current.value && isTerminalStatus(current.value.status))

// The stream payload may omit per-test details; fetch the full submission once in that case.
async function ensureDetails(verdict: Submission) {
    if (verdict.details !== undefined) return
    try {
        const res = await submissionService.getSubmissionById(verdict.id)
        if (current.value?.id === verdict.id) current.value = res.data.data
    } catch {
        if (current.value?.id === verdict.id) current.value = { ...verdict, details: null }
    }
}

watch(
    () => props.submission,
    (sub) => {
        if (!sub) return
        current.value = sub
        if (isTerminalStatus(sub.status)) {
            void ensureDetails(sub)
        } else {
            watchVerdict(sub.id, (verdict) => {
                current.value = verdict
                if (isTerminalStatus(verdict.status)) {
                    emit('judged', verdict)
                    void ensureDetails(verdict)
                }
            })
        }
    },
    { immediate: true },
)

// While the verdict is still pending/judging show a spinner and a neutral "Judging…" chip;
// terminal submissions render VerdictTiles instead.
const view = {
    label: 'Judging…',
    chipClass: `${STATUS_CHIP_BASE} bg-muted text-muted-foreground`,
}
</script>
