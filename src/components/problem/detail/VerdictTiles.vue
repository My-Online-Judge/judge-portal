<template>
    <div :class="['flex flex-col gap-4 text-sm', `v-${tone}`]">
        <div class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <h3 class="text-lg leading-snug font-bold tracking-[-0.01em] text-[var(--vi)]" data-test="verdict-title">
                    {{ meta.name }}
                </h3>
                <span v-if="rows.length" class="text-sm text-muted-foreground">
                    <b class="tabular font-semibold text-foreground" data-test="summary-count">{{ passed }} / {{ rows.length }}</b>
                    tests passed
                </span>
                <span class="meta-strip tabular ml-auto text-xs text-muted-foreground">
                    <span>#{{ submission.id.substring(0, 8) }}</span>
                    <span v-if="submission.language?.name">{{ submission.language.name }}</span>
                    <span v-if="submission.createdAt">{{ formatRelativeTime(submission.createdAt) }}</span>
                </span>
            </div>
            <p v-if="rows.length" class="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
                <span>Max time <b class="tabular font-semibold text-foreground">{{ formatMs(submission.cpuTime) }}</b></span>
                <span>Max memory <b class="tabular font-semibold text-foreground">{{ formatMem(submission.memory) }}</b></span>
            </p>
        </div>

        <pre
            v-if="submission.status === SubmissionResult.COMPILE_ERROR"
            class="max-h-56 overflow-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground"
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
            <div class="flex flex-wrap gap-x-7 gap-y-3.5">
                <div v-for="group in groups" :key="group.key" class="flex min-w-0 flex-col gap-2">
                    <span :id="`tiles-${group.key}`" class="text-xs font-medium text-muted-foreground">{{ group.title }}</span>
                    <div class="tiles" role="list" :aria-labelledby="`tiles-${group.key}`">
                        <span v-for="r in group.rows" :key="r.name" role="listitem" class="contents">
                            <button
                                type="button"
                                :data-test="`tile-${r.name}`"
                                :aria-label="ariaLabel(r)"
                                :aria-pressed="selected === r.name"
                                :class="tileClass(r)"
                                :style="revealStyle(r)"
                                @click="selected = r.name"
                            >
                                {{ r.name }}
                            </button>
                        </span>
                    </div>
                </div>
            </div>
            <TestCaseDetailPane v-if="selectedRow" :row="selectedRow" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import TestCaseDetailPane from './TestCaseDetailPane.vue'
import { firstFailingOrSample, passedCount, sortTests } from '@/lib/verdictTiles'
import { verdictMeta } from '@/lib/verdict'
import { formatMem, formatMs } from '@/lib/verdictFormat'
import { formatRelativeTime } from '@/utils/dateTimeUtils'
import { SubmissionResult, type Submission, type TestCaseResult } from '@/types/submission'

const props = defineProps<{ submission: Submission }>()

const meta = computed(() => verdictMeta(props.submission.status))
const tone = computed(() => meta.value.tone)

const rows = computed(() => sortTests(props.submission.details ?? []))
const passed = computed(() => passedCount(rows.value))

// Samples first, where the data is open; the hidden tests under their own label.
const groups = computed(() =>
    [
        { key: 'sample', title: 'Samples', rows: rows.value.filter((r) => r.sample) },
        { key: 'hidden', title: 'Hidden tests', rows: rows.value.filter((r) => !r.sample) },
    ].filter((g) => g.rows.length),
)
// Reveal order follows the reading order across both groups.
const revealOrder = computed(() => new Map(groups.value.flatMap((g) => g.rows).map((r, i) => [r.name, i])))

// The first failed test opens on its own: that is the one to look at.
const selected = ref<string | null>(firstFailingOrSample(rows.value))
watch(
    () => props.submission,
    () => {
        selected.value = firstFailingOrSample(rows.value)
    },
)
const selectedRow = computed(() => rows.value.find((r) => r.name === selected.value))

const motionOk = useMediaQuery('(prefers-reduced-motion: no-preference)')
const revealStyle = (r: TestCaseResult) =>
    motionOk.value ? { animationDelay: `${(revealOrder.value.get(r.name) ?? 0) * 24}ms` } : undefined

const ariaLabel = (r: TestCaseResult) =>
    `Test ${r.name}: ${verdictMeta(r.result).name}, ${r.sample ? 'sample' : 'hidden'}, show details`

const tileClass = (r: TestCaseResult) => [
    'tile',
    `v-${verdictMeta(r.result).tone}`,
    r.result === 0 ? 'pass' : '',
    motionOk.value ? 'reveal' : '',
]
</script>
