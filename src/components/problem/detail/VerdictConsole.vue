<template>
    <div class="border-t border-border bg-muted/30 px-4 py-3">
        <div v-if="!current" class="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal class="h-4 w-4" />
            Submit your code to see the verdict here.
        </div>
        <div v-else class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verdict</span>
            <Badge :class="view.chipClass">
                <Loader2 v-if="view.spinning" class="mr-1 inline h-3 w-3 animate-spin" />
                {{ view.label }}
            </Badge>
            <span class="tabular text-muted-foreground">#{{ current.id.substring(0, 8) }}</span>
            <template v-if="view.showMetrics">
                <span class="tabular text-muted-foreground">
                    {{ current.cpuTime != null ? `${current.cpuTime} ms` : '—' }}
                </span>
                <span class="tabular text-muted-foreground">
                    {{ current.memory ? `${(current.memory / (1024 * 1024)).toFixed(1)} MB` : '—' }}
                </span>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2, Terminal } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { getStatusChipClass, STATUS_CHIP_BASE } from '@/lib/submissionDisplay'
import { getSubmissionStatus, isTerminalStatus, type Submission } from '@/types/submission'
import { useSubmissionStream } from '@/composables/useSubmissionStream'

const props = defineProps<{ submission?: Submission | null }>()

const current = ref<Submission | null>(props.submission ?? null)
const { watch: watchVerdict } = useSubmissionStream()

// A fresh submission arrives from the Submit action with status PENDING. Show it
// optimistically, then subscribe to the stream and swap in the final verdict.
watch(
    () => props.submission,
    (sub) => {
        if (!sub) return
        current.value = sub
        if (!isTerminalStatus(sub.status)) {
            watchVerdict(sub.id, (verdict) => {
                current.value = verdict
            })
        }
    },
    { immediate: true },
)

interface VerdictView {
    label: string
    chipClass: string
    spinning: boolean
    showMetrics: boolean
}

// Map the submission's lifecycle → how the console presents it. While the verdict
// is still pending/judging we show a spinner and a neutral "Judging…" chip and
// hide the metrics (not known yet); once terminal we reveal the real verdict
// (colored chip) and the time/memory figures.
const view = computed<VerdictView>(() => {
    const sub = current.value
    if (!sub) return { label: '', chipClass: '', spinning: false, showMetrics: false }

    if (!isTerminalStatus(sub.status)) {
        return {
            label: 'Judging…',
            chipClass: `${STATUS_CHIP_BASE} bg-[#F0EFEC] text-[#6B6862]`,
            spinning: true,
            showMetrics: false,
        }
    }

    return {
        label: getSubmissionStatus(sub.status),
        chipClass: getStatusChipClass(sub.status),
        spinning: false,
        showMetrics: true,
    }
})
</script>
