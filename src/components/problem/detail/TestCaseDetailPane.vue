<template>
    <div class="overflow-hidden rounded-xl border border-border" role="region" :aria-label="`Test ${row.name} details`"
        data-test="detail-pane">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/60 px-3.5 py-2.5">
            <span class="font-semibold text-foreground">Test {{ row.name }}</span>
            <span class="text-[12.5px] text-muted-foreground">{{ row.sample ? 'Sample' : 'Hidden' }}</span>
            <span :class="['vpill', `v-${meta.tone}`]">{{ meta.name }}</span>
            <span class="meta-strip tabular ml-auto text-[12.5px] text-muted-foreground">
                <span>{{ formatMs(row.cpuTime) }}</span>
                <span>{{ formatMem(row.memory) }}</span>
            </span>
        </div>
        <!-- A hidden test shows its verdict and limits only: its data never reaches this pane. -->
        <p v-if="!row.sample" class="flex items-center gap-2 px-3.5 py-3 text-[12.5px] text-muted-foreground"
            data-test="hidden-note">
            <Lock class="size-3.5 shrink-0" aria-hidden="true" />
            Input and expected output of hidden tests are not shown.
        </p>
        <div v-else class="grid grid-cols-1 sm:grid-cols-3">
            <div v-for="(box, i) in boxes" :key="box.key" data-test="detail-box"
                :class="['min-w-0 px-3.5 pt-2 pb-3', i > 0 ? 'border-t border-border sm:border-t-0 sm:border-l' : '']">
                <div class="mb-1.5 flex h-7 items-center gap-2 text-xs">
                    <span class="font-medium text-muted-foreground">{{ box.title }}</span>
                    <button
                        v-if="box.text != null && box.text !== ''"
                        type="button"
                        class="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        :aria-label="copiedKey === box.key ? 'Copied' : `Copy ${box.title.toLowerCase()}`"
                        data-test="copy"
                        @click="onCopy(box.key, box.text)"
                    >
                        <Check v-if="copiedKey === box.key" class="size-3.5 text-success-ink" aria-hidden="true" />
                        <Copy v-else class="size-3.5" aria-hidden="true" />
                    </button>
                </div>
                <p v-if="box.text == null" class="text-xs text-muted-foreground">{{ box.missing }}</p>
                <p v-else-if="box.text === ''" class="text-xs text-muted-foreground">(no output)</p>
                <template v-else>
                    <!-- One row per line, so the first differing line can be marked in both outputs. -->
                    <pre class="max-h-48 overflow-auto rounded-md bg-muted/50 py-2 font-mono text-[12.5px] leading-[1.6] text-foreground"><span
                        v-for="(line, n) in lines(box)" :key="n"
                        :class="['block px-2.5', marks(box, n) ? 'bg-[color-mix(in_oklch,var(--v-wa)_14%,transparent)]' : '']"
                        >{{ line === '' ? ' ' : line }}</span></pre>
                    <p v-if="box.key === 'out' && diffLine != null" class="mt-1.5 text-xs text-[var(--v-wa-ink)]" data-test="diff-line">
                        Differs on line {{ diffLine }}
                    </p>
                    <button
                        v-if="clip(box.text).clipped && !expanded[box.key]"
                        type="button"
                        class="mt-1.5 text-xs font-medium text-link hover:underline"
                        data-test="show-all"
                        @click="expanded[box.key] = true"
                    >
                        Show all ({{ Math.ceil(box.text.length / 1024) }} KB)
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { Check, Copy, Lock } from 'lucide-vue-next'
import { useClipboard } from '@vueuse/core'
import { clipForDisplay, firstDiffLine } from '@/lib/verdictTiles'
import { verdictMeta } from '@/lib/verdict'
import { formatMem, formatMs } from '@/lib/verdictFormat'
import type { TestCaseResult } from '@/types/submission'

const props = defineProps<{ row: TestCaseResult }>()
const expanded = reactive<Record<string, boolean>>({})
const meta = computed(() => verdictMeta(props.row.result))

interface Box {
    key: string
    title: string
    text: string | null | undefined
    missing: string
}
const boxes = computed<Box[]>(() => (!props.row.sample ? [] : [
    { key: 'in', title: 'Input', text: props.row.input, missing: 'Not available' },
    { key: 'exp', title: 'Expected', text: props.row.expectedOutput, missing: 'Not available' },
    { key: 'out', title: 'Your output', text: props.row.actualOutput, missing: 'Output not kept (too large to store)' },
]))

const diffLine = computed(() =>
    props.row.expectedOutput != null && props.row.actualOutput != null
        ? firstDiffLine(props.row.expectedOutput, props.row.actualOutput)
        : null,
)

const clip = clipForDisplay
const display = (box: Box): string => (expanded[box.key] ? (box.text ?? '') : clipForDisplay(box.text ?? '').shown)
const lines = (box: Box): string[] => display(box).replace(/\n$/, '').split('\n')
// The first differing line is marked in Expected and Your output, never in Input.
const marks = (box: Box, index: number) => box.key !== 'in' && diffLine.value === index + 1

// The copy button turns into a check for a moment instead of raising a toast.
const { copy } = useClipboard({ legacy: true })
const copiedKey = ref<string | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | undefined
const onCopy = async (key: string, text: string) => {
    await copy(text)
    copiedKey.value = key
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (copiedKey.value = null), 1500)
}
onBeforeUnmount(() => clearTimeout(resetTimer))
</script>
