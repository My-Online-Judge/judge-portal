<template>
    <div class="flex flex-col gap-3.5 px-4 pt-3.5 pb-4">
        <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Test cases">
                <span v-for="(c, i) in cases" :key="c.id" class="relative inline-flex">
                    <button type="button" role="tab" :aria-selected="c.id === selectedId" :data-test="`case-${i + 1}`"
                        :class="[
                            'inline-flex h-8 items-center gap-1.5 rounded-lg border text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            c.custom ? 'pr-7 pl-3' : 'px-3',
                            c.id === selectedId
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-card text-muted-foreground hover:border-input hover:text-foreground',
                        ]"
                        @click="selectedId = c.id">
                        <span v-if="outcomes[c.id]" aria-hidden="true" class="size-1.5 rounded-full"
                            :style="{ backgroundColor: `var(--v-${outcomes[c.id]!.tone})` }" />
                        Case {{ i + 1 }}
                    </button>
                    <button v-if="c.custom" type="button" :aria-label="`Remove case ${i + 1}`"
                        :class="[
                            'absolute top-1/2 right-1 grid size-5 -translate-y-1/2 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                            c.id === selectedId ? 'text-background/70 hover:text-background' : 'text-muted-foreground hover:text-foreground',
                        ]"
                        @click="removeCase(c.id)">
                        <X class="size-3.5" aria-hidden="true" />
                    </button>
                </span>
            </div>
            <button v-if="cases.length < MAX_CASES" type="button" data-test="add-case"
                class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-input px-3 text-sm font-medium text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                @click="addCase">
                <Plus class="size-3.5" aria-hidden="true" />
                Custom
            </button>
            <span class="flex-1" />
            <span v-if="running" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 class="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Running…
            </span>
            <span v-else-if="current && outcomes[current.id]" data-test="case-outcome"
                :class="['inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--vi)]', `v-${outcomes[current.id]!.tone}`]">
                <component :is="outcomes[current.id]!.icon" v-if="outcomes[current.id]!.icon" class="size-4" aria-hidden="true" />
                {{ outcomes[current.id]!.label }}
            </span>
        </div>

        <p v-if="unavailable" role="status" class="rounded-lg bg-muted/70 px-3.5 py-2.5 text-sm text-muted-foreground">
            Run isn't available on this server yet. Submit to judge your code on every test.
        </p>
        <pre v-else-if="runError" data-test="run-error"
            class="max-h-40 overflow-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">{{ runError }}</pre>

        <div v-if="current" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="min-w-0">
                <label :for="`case-input-${current.id}`" class="mb-1.5 block text-xs text-muted-foreground">Input</label>
                <textarea :id="`case-input-${current.id}`" v-model="current.input" :readonly="!current.custom" rows="5"
                    spellcheck="false" data-test="case-input"
                    :placeholder="current.custom ? 'Type the input for this case' : undefined"
                    class="block w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 font-mono text-sm leading-relaxed text-foreground outline-none read-only:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40" />
            </div>
            <div class="min-w-0">
                <div class="mb-1.5 text-xs text-muted-foreground">Your output</div>
                <pre v-if="currentResult" data-test="case-output"
                    :class="['min-h-[5.5rem] overflow-auto rounded-lg border px-3 py-2.5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground', outputTint]">{{ currentResult.output ?? '' }}</pre>
                <p v-else class="flex min-h-[5.5rem] items-center rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
                    Run your code to see what it prints.
                </p>
            </div>
            <div class="min-w-0">
                <div class="mb-1.5 text-xs text-muted-foreground">Expected</div>
                <pre v-if="current.expected != null"
                    class="min-h-[5.5rem] overflow-auto rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground">{{ current.expected }}</pre>
                <p v-else class="flex min-h-[5.5rem] items-center rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
                    No expected output: a custom case only checks that your code runs.
                </p>
            </div>
        </div>

        <p class="text-xs text-muted-foreground">Run checks your code against these cases only. It doesn't count as a submission.</p>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { Loader2, Plus, X } from 'lucide-vue-next'
import submissionService from '@/services/submissionService'
import { getErrorMessage } from '@/lib/errorMessage'
import { verdictMeta, type VerdictTone } from '@/lib/verdict'
import { formatMs } from '@/lib/verdictFormat'
import { useToast } from '@/composables/useToast'
import { SubmissionResult, type RunCaseResult } from '@/types/submission'
import type { LucideIcon } from 'lucide-vue-next'

const props = defineProps<{
    problemSlug: string
    contestSlug?: string
    sampleInput?: string | null
    sampleOutput?: string | null
}>()

const MAX_CASES = 6

interface Case {
    id: number
    custom: boolean
    input: string
    /** Null on a custom case: there is nothing to compare its output with. */
    expected: string | null
}

let nextId = 1
const cases = ref<Case[]>([])
const resetCases = () => {
    cases.value = props.sampleInput != null
        ? [{ id: nextId++, custom: false, input: props.sampleInput, expected: props.sampleOutput ?? '' }]
        : [{ id: nextId++, custom: true, input: '', expected: null }]
}
resetCases()
watch(() => [props.sampleInput, props.sampleOutput], resetCases)

const selectedId = ref(cases.value[0]!.id)
const current = computed(() => cases.value.find((c) => c.id === selectedId.value) ?? cases.value[0])

const addCase = () => {
    // A new custom case starts from the selected one's input, the usual way to try a variation.
    const c: Case = { id: nextId++, custom: true, input: current.value?.input ?? '', expected: null }
    cases.value.push(c)
    selectedId.value = c.id
}
const removeCase = (id: number) => {
    const at = cases.value.findIndex((c) => c.id === id)
    cases.value.splice(at, 1)
    delete results[id]
    if (selectedId.value === id) selectedId.value = cases.value[Math.max(0, at - 1)]!.id
}

// --- Running ---
const running = ref(false)
const unavailable = ref(false)
const runError = ref<string | null>(null)
// The last run's result by case id; a case edited since keeps its old result until the next run.
const results = reactive<Record<number, RunCaseResult>>({})
const currentResult = computed(() => (current.value ? results[current.value.id] : undefined))

interface Outcome {
    tone: VerdictTone
    label: string
    icon: LucideIcon | null
}
// A custom case has nothing to compare with: running cleanly is all it can say.
const outcomeOf = (c: Case, r: RunCaseResult): Outcome => {
    const meta = verdictMeta(r.result)
    const time = r.cpuTime != null ? ` in ${formatMs(r.cpuTime)}` : ''
    if (r.result === SubmissionResult.SUCCESS) {
        return { tone: 'ac', label: c.custom ? `Ran${time}` : `Passed${time}`, icon: meta.icon }
    }
    return { tone: meta.tone, label: meta.name, icon: meta.icon }
}
const outcomes = computed(() => {
    const out: Record<number, Outcome> = {}
    for (const c of cases.value) {
        const r = results[c.id]
        if (r) out[c.id] = outcomeOf(c, r)
    }
    return out
})
const outputTint = computed(() => {
    const r = currentResult.value
    if (!r) return 'border-border'
    return r.result === SubmissionResult.SUCCESS
        ? 'border-[color-mix(in_oklch,var(--v-ac)_35%,transparent)] bg-[color-mix(in_oklch,var(--v-ac)_8%,var(--card))]'
        : 'border-[color-mix(in_oklch,var(--v-wa)_35%,transparent)] bg-[color-mix(in_oklch,var(--v-wa)_7%,var(--card))]'
})

const { error: errorToast } = useToast()

// The server answers a missing route with 404 (or 405/501 from a proxy): Run is not deployed there yet.
const NOT_DEPLOYED = new Set([404, 405, 501])

/** Runs the code against every case. Resolves when the results are in (or the run failed and said why). */
const run = async (source: { sourceCode: string; languageIdentifier?: string }) => {
    if (running.value || !source.languageIdentifier || !source.sourceCode.trim()) return
    running.value = true
    runError.value = null
    const sent = cases.value.map((c) => ({ ...c }))
    try {
        const res = await submissionService.run({
            problemSlug: props.problemSlug,
            languageIdentifier: source.languageIdentifier,
            sourceCode: source.sourceCode,
            ...(props.contestSlug ? { contestSlug: props.contestSlug } : {}),
            cases: sent.map((c) => (c.expected != null ? { input: c.input, expectedOutput: c.expected } : { input: c.input })),
        })
        unavailable.value = false
        const body = res.data.data
        for (const key of Object.keys(results)) delete results[Number(key)]
        if (body.result === SubmissionResult.COMPILE_ERROR || !body.cases.length) {
            runError.value = body.errorMessage || verdictMeta(body.result ?? SubmissionResult.SYSTEM_ERROR).name
            return
        }
        sent.forEach((c, i) => {
            const r = body.cases[i]
            if (r) results[c.id] = r
        })
        const failed = sent.find((c) => results[c.id] && results[c.id]!.result !== SubmissionResult.SUCCESS)
        if (failed) selectedId.value = failed.id
        const message = failed && results[failed.id]?.errorMessage
        if (message) runError.value = message
    } catch (error) {
        if (isAxiosError(error) && NOT_DEPLOYED.has(error.response?.status ?? 0)) {
            unavailable.value = true
        } else {
            errorToast(getErrorMessage(error, "Couldn't run your code"))
        }
    } finally {
        running.value = false
    }
}

defineExpose({ run, running })
</script>
