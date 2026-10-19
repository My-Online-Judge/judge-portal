<template>
    <div class="mt-3 rounded-md border border-border bg-background p-3" data-test="detail-pane">
        <div class="mb-2 text-xs font-medium text-foreground">
            Test {{ row.name }} (open) · {{ resultName(row.result) }} · {{ formatMs(row.cpuTime) }} ·
            {{ formatMem(row.memory) }}
        </div>
        <div class="grid gap-3 md:grid-cols-3">
            <div v-for="box in boxes" :key="box.key" class="min-w-0" data-test="detail-box">
                <div class="mb-1 flex items-center justify-between">
                    <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {{ box.title }}
                    </span>
                    <Button
                        v-if="box.text != null && box.text !== ''"
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6"
                        :aria-label="`Copy ${box.title}`"
                        data-test="copy"
                        @click="copy(box.text)"
                    >
                        <Copy class="h-3 w-3" />
                    </Button>
                </div>
                <p v-if="box.text == null" class="text-xs italic text-muted-foreground">{{ box.missing }}</p>
                <p v-else-if="box.text === ''" class="text-xs italic text-muted-foreground">(no output)</p>
                <template v-else>
                    <pre
                        class="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs text-foreground"
                        >{{ display(box) }}</pre
                    >
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
    </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Copy } from 'lucide-vue-next'
import { useClipboard } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { clipForDisplay, resultName } from '@/lib/verdictTiles'
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

const clip = clipForDisplay
const display = (box: Box): string => (expanded[box.key] ? (box.text ?? '') : clipForDisplay(box.text ?? '').shown)
</script>
