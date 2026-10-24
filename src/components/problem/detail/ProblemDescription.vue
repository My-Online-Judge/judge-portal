<template>
    <div class="flex flex-col text-base leading-[1.75]">
        <RichContent v-if="problem.description" :html="problem.description" />

        <!-- The author's one-paragraph restatement of the task ("subject" in the editor). -->
        <section v-if="problem.subject" aria-labelledby="problem-summary"
            :class="['rounded-[10px] bg-primary-soft/70 px-4 py-3.5 text-sm leading-relaxed', problem.description ? 'mt-5' : '']">
            <h2 id="problem-summary" class="mb-1 text-xs font-semibold text-info-ink">Summary</h2>
            <RichContent :html="problem.subject" />
        </section>

        <section v-for="s in sections" :key="s.key" :aria-labelledby="`problem-${s.key}`" class="mt-7">
            <h2 :id="`problem-${s.key}`" class="mb-2 text-base font-semibold text-foreground">{{ s.title }}</h2>
            <RichContent :html="s.html" />
        </section>

        <section aria-labelledby="problem-examples" class="mt-7">
            <h2 id="problem-examples" class="mb-3 text-base font-semibold text-foreground">Examples</h2>
            <div class="grid grid-cols-1 overflow-hidden rounded-[10px] border border-border sm:grid-cols-2">
                <div v-for="(box, i) in samples" :key="box.key"
                    :class="['min-w-0', i > 0 ? 'border-t border-border sm:border-t-0 sm:border-l' : '']">
                    <div class="flex h-9 items-center justify-between border-b border-border bg-muted/50 pr-1.5 pl-3.5">
                        <span class="text-xs font-medium text-muted-foreground">{{ box.title }}</span>
                        <button type="button" :aria-label="copiedKey === box.key ? 'Copied' : `Copy ${box.title.toLowerCase()}`"
                            class="grid size-[30px] place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            @click="onCopy(box.key, box.text)">
                            <Check v-if="copiedKey === box.key" class="size-3.5 text-success-ink" aria-hidden="true" />
                            <Copy v-else class="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                    <pre class="m-0 overflow-x-auto px-3.5 py-3 font-mono text-sm leading-relaxed text-foreground">{{ box.text }}</pre>
                </div>
            </div>
        </section>

        <!-- Folded by default: a hint is a spoiler the reader asks for. -->
        <details v-if="problem.hint" class="group mt-7 rounded-[10px] border border-border">
            <summary
                class="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-foreground outline-none select-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <ChevronRight class="size-4 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
                    aria-hidden="true" />
                Hint
            </summary>
            <div class="border-t border-border px-3.5 py-3">
                <RichContent :html="problem.hint" />
            </div>
        </details>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Check, ChevronRight, Copy } from 'lucide-vue-next'
import RichContent from '@/components/common/RichContent.vue'
import type { Problem } from '@/types/problem'
import { useClipboard } from '@vueuse/core'

const props = defineProps<{ problem: Problem }>()

const sections = computed(() => [
    { key: 'input', title: 'Input', html: props.problem.inputDescription },
    { key: 'output', title: 'Output', html: props.problem.outputDescription },
])

const samples = computed(() => [
    { key: 'input', title: 'Input 1', text: props.problem.sampleInput },
    { key: 'output', title: 'Output 1', text: props.problem.sampleOutput },
])

// The button itself says "Copied" for a moment instead of a toast.
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
