<template>
    <div class="space-y-3 text-sm">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <VerdictChip size="lg" :status="submission.status" :label="verdictTitle(submission.status, firstFail?.name)" />
            <span v-if="rows.length" class="meta-strip tabular text-xs text-muted-foreground">
                <span data-test="summary-count">{{ passed }}/{{ rows.length }} tests</span>
                <span>{{ formatMs(submission.cpuTime) }}</span>
                <span>{{ formatMem(submission.memory) }}</span>
            </span>
        </div>

        <pre
            v-if="submission.status === SubmissionResult.COMPILE_ERROR"
            class="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-foreground p-3 font-mono text-xs text-background"
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
                <div class="tiles" role="list" aria-label="Test results">
                    <template v-for="(r, i) in rows" :key="r.name">
                        <button
                            v-if="r.sample"
                            type="button"
                            role="listitem"
                            :data-test="`tile-${r.name}`"
                            :aria-label="ariaLabel(r)"
                            :aria-pressed="selected === r.name"
                            :class="tileClass(r)"
                            :style="revealStyle(i)"
                            @click="selected = r.name"
                        >
                            <span class="tn">{{ r.name }}</span>
                            <span class="tv"><component :is="iconOf(r)" v-if="iconOf(r)" aria-hidden="true" />{{ tileLabel(r.result) }}</span>
                        </button>
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
                                    <span class="tv"><component :is="iconOf(r)" v-if="iconOf(r)" aria-hidden="true" />{{ tileLabel(r.result) }}</span>
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
const iconOf = (r: TestCaseResult) => verdictMeta(r.result).icon

const ariaLabel = (r: TestCaseResult) =>
    `Test ${r.name}: ${verdictMeta(r.result).name}${r.sample ? ', sample, show details' : ', hidden'}`

const tileClass = (r: TestCaseResult) => [
    'tile',
    `v-${verdictMeta(r.result).tone}`,
    r.sample ? 'open' : '',
    motionOk.value ? 'reveal' : '',
]
</script>
