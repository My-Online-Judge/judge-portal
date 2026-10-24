<template>
    <div class="space-y-6">
        <!-- Description (lead) -->
        <RichContent v-if="problem.description" :html="problem.description" />

        <!-- Subject -->
        <section>
            <h2 class="mb-4 text-base font-semibold text-foreground">Subject</h2>
            <RichContent :html="problem.subject" />
        </section>

        <!-- Input -->
        <section>
            <h2 class="mb-4 text-base font-semibold text-foreground">Input</h2>
            <RichContent :html="problem.inputDescription" />
        </section>

        <!-- Output -->
        <section>
            <h2 class="mb-4 text-base font-semibold text-foreground">Output</h2>
            <RichContent :html="problem.outputDescription" />
        </section>

        <!-- Sample: two wells, input and output -->
        <section>
            <h2 class="mb-4 text-base font-semibold text-foreground">Example</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <figure v-for="s in samples" :key="s.key" class="m-0 min-w-0">
                    <figcaption class="mb-1 flex min-h-6 items-center justify-between gap-2 text-sm text-muted-foreground">
                        {{ s.title }}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <button type="button" :aria-label="s.copyLabel"
                                        class="relative inline-flex size-6 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors motion-reduce:transition-none after:absolute after:-inset-2.5 hover:bg-muted hover:text-foreground"
                                        @click="onCopy(s.text)">
                                        <Copy class="size-3.5" aria-hidden="true" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Click to copy</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </figcaption>
                    <pre class="m-0 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-sm leading-[1.55] text-foreground">{{ s.text }}</pre>
                </figure>
            </div>
        </section>

        <!-- Hint -->
        <section v-if="problem.hint">
            <h2 class="mb-4 text-base font-semibold text-foreground">Hint</h2>
            <RichContent :html="problem.hint" />
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Copy } from 'lucide-vue-next'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import RichContent from '@/components/common/RichContent.vue'
import type { Problem } from '@/types/problem'
import { useClipboard } from '@vueuse/core'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ problem: Problem }>()

const samples = computed(() => [
    { key: 'in', title: 'Input', text: props.problem.sampleInput, copyLabel: 'Copy sample input' },
    { key: 'out', title: 'Output', text: props.problem.sampleOutput, copyLabel: 'Copy sample output' },
])

const { triggerToast } = useToast()
const { copy } = useClipboard()

const onCopy = (text: string) => {
    copy(text)
    triggerToast('Copied to clipboard')
}
</script>
