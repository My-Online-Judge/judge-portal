<template>
    <div class="tile-detail mt-3" role="region" :aria-label="`Test ${row.name} details`" data-test="detail-pane">
        <div class="head-row">
            <VerdictChip :status="row.result" />
            <b>Test {{ row.name }}</b>
            <span class="rounded-md bg-primary/10 px-1.5 text-xs font-medium text-primary">Sample</span>
            <span class="meta-strip tabular ml-auto font-mono text-xs text-muted-foreground">
                <span>{{ formatMs(row.cpuTime) }}</span>
                <span>{{ formatMem(row.memory) }}</span>
            </span>
        </div>
        <div v-for="box in boxes" :key="box.key" data-test="detail-box">
            <div class="h">
                <span>{{ box.title }}</span>
                <span v-if="box.key === 'out' && diffLine != null" class="text-[var(--v-wa-ink)]" data-test="diff-line">
                    Differs on line {{ diffLine }}
                </span>
                <Button
                    v-if="box.text != null && box.text !== ''"
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6"
                    :aria-label="`Copy ${box.title.toLowerCase()}`"
                    data-test="copy"
                    @click="copy(box.text)"
                >
                    <Copy class="h-3 w-3" />
                </Button>
            </div>
            <p v-if="box.text == null" class="text-xs italic text-muted-foreground">{{ box.missing }}</p>
            <p v-else-if="box.text === ''" class="text-xs italic text-muted-foreground">(no output)</p>
            <template v-else>
                <pre class="max-h-48 overflow-auto">{{ display(box) }}</pre>
                <button
                    v-if="clip(box.text).clipped && !expanded[box.key]"
                    type="button"
                    class="mt-1 text-xs text-primary underline"
                    data-test="show-all"
                    @click="expanded[box.key] = true"
                >
                    Show all ({{ Math.ceil(box.text.length / 1024) }} KB)
                </button>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Copy } from 'lucide-vue-next'
import { useClipboard } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import VerdictChip from '@/components/common/VerdictChip.vue'
import { clipForDisplay, firstDiffLine } from '@/lib/verdictTiles'
import { formatMem, formatMs } from '@/lib/verdictFormat'
import type { TestCaseResult } from '@/types/submission'

const props = defineProps<{ row: TestCaseResult }>()
const { copy } = useClipboard()
const expanded = reactive<Record<string, boolean>>({})

interface Box {
    key: string
    title: string
    text: string | null | undefined
    missing: string
}
const boxes = computed<Box[]>(() => [
    { key: 'in', title: 'Input', text: props.row.input, missing: 'Not available' },
    { key: 'exp', title: 'Expected', text: props.row.expectedOutput, missing: 'Not available' },
    { key: 'out', title: 'Your output', text: props.row.actualOutput, missing: 'Output not kept (too large to store)' },
])

const diffLine = computed(() =>
    props.row.expectedOutput != null && props.row.actualOutput != null
        ? firstDiffLine(props.row.expectedOutput, props.row.actualOutput)
        : null,
)

const clip = clipForDisplay
const display = (box: Box): string => (expanded[box.key] ? (box.text ?? '') : clipForDisplay(box.text ?? '').shown)
</script>
