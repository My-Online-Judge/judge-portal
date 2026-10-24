<template>
    <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <VerdictChip size="lg" :status="submission.status" :label="verdictTitle(submission.status, firstFail?.name)" />
            <span v-if="rows.length" class="flex flex-wrap gap-4 text-sm text-ink-2 tabular-nums">
                <span data-test="summary-count">{{ passed }}/{{ rows.length }} tests</span>
                <span>{{ formatMs(submission.cpuTime) }}</span>
                <span>{{ formatMem(submission.memory) }}</span>
            </span>
        </div>

        <pre
            v-if="submission.status === SubmissionResult.COMPILE_ERROR"
            class="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm text-foreground"
            data-test="compile-error"
            >{{ submission.errorMessage }}</pre
        >
        <p v-else-if="submission.status === SubmissionResult.SYSTEM_ERROR" class="text-sm text-muted-foreground">
            Something went wrong while judging. Please submit again.
        </p>
        <p v-else-if="submission.details == null" class="text-sm text-muted-foreground">
            Per-test results are not available for this submission.
        </p>
        <template v-else-if="rows.length">
            <TooltipProvider>
                <div class="tiles" role="list" aria-label="Test results">
                    <template v-for="(r, i) in rows" :key="r.name">
                        <span v-if="r.sample" role="listitem" class="contents">
                            <button
                                type="button"
                                :data-test="`tile-${r.name}`"
                                :aria-label="ariaLabel(r)"
                                :aria-pressed="selected === r.name"
                                :class="tileClass(r)"
                                :style="revealStyle(i)"
                                @click="selected = r.name"
                            >
                                <span class="tn">{{ r.name }}</span>
                                <span class="tv">{{ tileLabel(r.result) }}</span>
                            </button>
                        </span>
                        <Tooltip v-else>
                            <TooltipTrigger as-child>
                                <span
                                    role="listitem"
                                    :data-test="`tile-${r.name}`"
                                    :aria-label="ariaLabel(r)"
                                    :class="tileClass(r)"
                                    :style="revealStyle(i)"
                                >
                                    <span class="tn">{{ r.name }}</span>
                                    <span class="tv">{{ tileLabel(r.result) }}</span>
                                    <Lock class="lock" aria-hidden="true" />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                Test {{ r.name }}, hidden. {{ verdictMeta(r.result).name }}, {{ formatMs(r.cpuTime) }},
                                {{ formatMem(r.memory) }}
                            </TooltipContent>
                        </Tooltip>
                    </template>
                </div>
            </TooltipProvider>
            <TestCaseDetailPane v-if="selectedRow" :row="selectedRow" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Lock } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import TestCaseDetailPane from './TestCaseDetailPane.vue'
import VerdictChip from '@/components/common/VerdictChip.vue'
import { defaultSelection, passedCount, sortTests, tileLabel } from '@/lib/verdictTiles'
import { verdictMeta, verdictTitle } from '@/lib/verdict'
import { formatMem, formatMs } from '@/lib/verdictFormat'
import { SubmissionResult, type Submission, type TestCaseResult } from '@/types/submission'

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

const motionOk = useMediaQuery('(prefers-reduced-motion: no-preference)')
const revealStyle = (i: number) => (motionOk.value ? { animationDelay: `${i * 30}ms` } : undefined)

const ariaLabel = (r: TestCaseResult) =>
    `Test ${r.name}: ${verdictMeta(r.result).name}${r.sample ? ', sample, show details' : ', hidden'}`

const tileClass = (r: TestCaseResult) => [
    'tile',
    `v-${verdictMeta(r.result).tone}`,
    r.sample ? 'open' : '',
    motionOk.value ? 'reveal' : '',
]
</script>
