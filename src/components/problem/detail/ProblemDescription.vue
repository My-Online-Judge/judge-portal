<template>
    <div class="space-y-6">
        <!-- Description (lead) -->
        <RichContent v-if="problem.description" :html="problem.description" />

        <!-- Subject -->
        <div>
            <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</h3>
            <RichContent :html="problem.subject" />
        </div>

        <!-- Input -->
        <div>
            <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Input</h3>
            <RichContent :html="problem.inputDescription" />
        </div>

        <!-- Output -->
        <div>
            <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Output</h3>
            <RichContent :html="problem.outputDescription" />
        </div>

        <!-- Sample -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <h4 class="mb-2 flex items-center gap-2 font-medium text-foreground">
                    Sample Input
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <button type="button" class="focus:outline-none" aria-label="Copy sample input"
                                    @click="onCopy(problem.sampleInput)">
                                    <Copy class="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Click to copy</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </h4>
                <pre class="m-0 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-3 font-mono text-sm text-foreground">{{ problem.sampleInput }}</pre>
            </div>
            <div>
                <h4 class="mb-2 flex items-center gap-2 font-medium text-foreground">
                    Sample Output
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <button type="button" class="focus:outline-none" aria-label="Copy sample output"
                                    @click="onCopy(problem.sampleOutput)">
                                    <Copy class="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Click to copy</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </h4>
                <pre class="m-0 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-3 font-mono text-sm text-foreground">{{ problem.sampleOutput }}</pre>
            </div>
        </div>

        <!-- Hint -->
        <div v-if="problem.hint">
            <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Hint</h3>
            <RichContent :html="problem.hint" />
        </div>
    </div>
</template>

<script setup lang="ts">
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

defineProps<{ problem: Problem }>()

const { triggerToast } = useToast()
const { copy } = useClipboard()

const onCopy = (text: string) => {
    copy(text)
    triggerToast('Copied!')
}
</script>
