<template>
    <div class="tile-detail" role="region" :aria-label="`Test ${row.name} details`" data-test="detail-pane">
        <div class="head-row">
            <VerdictChip :status="row.result" />
            <span class="font-medium text-foreground">Test {{ row.name }}</span>
            <span class="text-muted-foreground">Sample</span>
            <span class="ml-auto flex gap-4 text-ink-2 tabular-nums">
                <span>{{ formatMs(row.cpuTime) }}</span>
                <span>{{ formatMem(row.memory) }}</span>
            </span>
        </div>
        <div v-for="box in boxes" :key="box.key" data-test="detail-box">
            <div class="h">
                <span class="whitespace-nowrap">{{ box.title }}</span>
                <Button
                    v-if="box.text != null && box.text !== ''"
                    variant="ghost"
                    size="icon-sm"
                    class="size-6 after:-inset-2.5"
                    :aria-label="`Copy ${box.title.toLowerCase()}`"
                    data-test="copy"
                    @click="copy(box.text)"
                >
                    <Copy class="size-3.5" />
                </Button>
            </div>
            <p v-if="box.text == null" class="text-sm italic text-muted-foreground">{{ box.missing }}</p>
            <p v-else-if="box.text === ''" class="text-sm italic text-muted-foreground">(no output)</p>
            <template v-else>
                <pre class="max-h-48 overflow-auto">{{ display(box) }}</pre>
                <button
                    v-if="clip(box.text).clipped && !expanded[box.key]"
                    type="button"
                    class="mt-1 cursor-pointer whitespace-nowrap text-sm text-primary underline"
                    data-test="show-all"
                    @click="expanded[box.key] = true"
                >
                    Show all ({{ Math.ceil(box.text.length / 1024) }} KB)
                </button>
            </template>
            <!-- Under the well, so the three labels stay on one line in a narrow pane. -->
            <div v-if="box.key === 'out' && diffLine != null" class="mt-1 text-sm text-v-wa-ink" data-test="diff-line">
                Differs on line {{ diffLine }}
            </div>
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
