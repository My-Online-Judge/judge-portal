<template>
    <div class="space-y-2 text-sm">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verdict</span>
            <Badge :class="getStatusChipClass(submission.status)">{{ getSubmissionStatus(submission.status) }}</Badge>
            <span v-if="firstFail" class="tabular text-muted-foreground" data-test="first-fail">
                Test {{ firstFail.name }} · {{ formatMs(firstFail.cpuTime) }} · {{ formatMem(firstFail.memory) }}
            </span>
            <span v-if="rows.length" class="tabular ml-auto text-muted-foreground" data-test="summary-count">
                {{ passed }} / {{ rows.length }}
            </span>
        </div>

        <pre
            v-if="submission.status === SubmissionResult.COMPILE_ERROR"
            class="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-foreground p-3 font-mono text-xs text-background"
            data-test="compile-error"
            >{{ submission.errorMessage }}</pre
        >
        <p v-else-if="submission.status === SubmissionResult.SYSTEM_ERROR" class="text-muted-foreground">
            Something went wrong while judging. Please submit again.
        </p>
        <p v-else-if="submission.details == null" class="text-muted-foreground">
            Per-test results are not available for this submission.
        </p>
        <template v-else-if="rows.length">
            <TooltipProvider>
                <div class="flex flex-wrap gap-1.5">
                    <Tooltip v-for="r in rows" :key="r.name" :disabled="r.sample">
                        <TooltipTrigger as-child>
                            <button
                                type="button"
                                :data-test="`tile-${r.name}`"
                                :aria-label="ariaLabel(r)"
                                :aria-pressed="r.sample ? selected === r.name : undefined"
                                :class="tileClass(r)"
                                @click="r.sample && (selected = r.name)"
                            >
                                <Lock v-if="!r.sample" class="h-3 w-3" aria-hidden="true" />
                                {{ tileLabel(r.result) }} {{ r.name }}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Test {{ r.name }} · hidden · {{ resultName(r.result) }} · {{ formatMs(r.cpuTime) }} ·
                            {{ formatMem(r.memory) }}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
            <TestCaseDetailPane v-if="selectedRow" :row="selectedRow" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Lock } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import TestCaseDetailPane from './TestCaseDetailPane.vue'
import { getStatusChipClass } from '@/lib/submissionDisplay'
import { defaultSelection, passedCount, resultName, sortTests, tileLabel } from '@/lib/verdictTiles'
import { formatMem, formatMs } from '@/lib/verdictFormat'
import {
    getSubmissionStatus,
    SubmissionResult,
    type Submission,
    type TestCaseResult,
} from '@/types/submission'

const props = defineProps<{ submission: Submission }>()

const rows = computed(() => sortTests(props.submission.details ?? []))
const passed = computed(() => passedCount(rows.value))
const firstFail = computed(() =>
    props.submission.status === SubmissionResult.SUCCESS ? undefined : rows.value.find((r) => r.result !== 0),
)

const selected = ref<string | null>(defaultSelection(rows.value))
watch(
    () => props.submission,
    () => {
        selected.value = defaultSelection(rows.value)
    },
)
// Only sample rows can ever be shown in the detail pane.
const selectedRow = computed(() => rows.value.find((r) => r.sample && r.name === selected.value))

const ariaLabel = (r: TestCaseResult) =>
    `Test ${r.name}, ${r.sample ? 'open' : 'hidden'}, ${resultName(r.result)}, ${formatMs(r.cpuTime)}, ${formatMem(r.memory)}`

const tileClass = (r: TestCaseResult) => [
    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium tabular',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    r.result === 0
        ? 'border-[var(--ok)] text-[var(--ok)]'
        : 'border-destructive bg-destructive/10 text-destructive',
    r.sample ? 'cursor-pointer' : 'cursor-default',
    r.sample && selected.value === r.name ? 'ring-2 ring-ring' : '',
]
</script>
