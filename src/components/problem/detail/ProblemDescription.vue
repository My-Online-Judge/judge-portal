<template>
    <Card>
        <CardContent class="space-y-6">
            <!-- Description -->
            <div v-if="problem.description">
                <div class="leading-relaxed" v-html="problem.description"></div>
            </div>

            <div>
                <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</h3>
                <div class="leading-relaxed" v-html="problem.subject"></div>
            </div>

            <!-- Input -->
            <div>
                <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Input</h3>
                <div class="leading-relaxed" v-html="problem.inputDescription"></div>
            </div>

            <!-- Output -->
            <div>
                <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Output</h3>
                <div class="leading-relaxed" v-html="problem.outputDescription"></div>
            </div>

            <!-- Sample -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="mb-2 flex items-center gap-2 font-medium text-foreground">
                        Sample Input
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <button class="focus:outline-none" @click="onCopy(problem.sampleInput)">
                                        <Copy class="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Click to copy</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </h4>
                    <div class="rounded-md border border-border bg-muted p-3 font-mono text-sm text-foreground">
                        {{ problem.sampleInput }}
                    </div>
                </div>
                <div>
                    <h4 class="mb-2 flex items-center gap-2 font-medium text-foreground">
                        Sample Output
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <button class="focus:outline-none" @click="onCopy(problem.sampleOutput)">
                                        <Copy class="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Click to copy</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </h4>
                    <div class="rounded-md border border-border bg-muted p-3 font-mono text-sm text-foreground">
                        {{ problem.sampleOutput }}
                    </div>
                </div>
            </div>

            <!-- Hint -->
            <div v-if="problem.hint">
                <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Hint</h3>
                <div class="leading-relaxed" v-html="problem.hint"></div>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Copy } from 'lucide-vue-next'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
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