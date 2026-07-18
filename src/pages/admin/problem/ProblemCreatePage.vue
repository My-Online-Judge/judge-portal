<template>
    <div class="flex w-full flex-col gap-[22px]">
        <!-- Header -->
        <div class="flex flex-col gap-3">
            <RouterLink
                :to="{ name: 'AdminProblems' }"
                class="inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft class="size-4" />
                Problems
            </RouterLink>
            <div class="min-w-0">
                <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Create problem</h1>
                <p class="mt-1 text-sm text-muted-foreground">Add a problem to the catalog. Fields marked * are required.</p>
            </div>
        </div>

        <!-- Form -->
        <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
            <ProblemFormFields
                v-model="payload"
                mode="create"
                :errors="errors"
            />

            <!-- Test cases -->
            <section class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Test cases <span class="text-destructive">*</span></h3>
                    <p class="mt-0.5 text-xs text-muted-foreground">Add at least one input/output pair. These become the judge's test data.</p>
                </div>
                <div class="space-y-3 p-5">
                    <TestCaseEditor v-model="testCases" />
                    <p v-if="errors.testCases" class="text-xs text-destructive">{{ errors.testCases }}</p>
                </div>
            </section>

            <!-- Import problem (placeholder) -->
            <section class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Import problem</h3>
                    <p class="mt-0.5 text-xs text-muted-foreground">Create a problem from an exported package instead of filling the form.</p>
                </div>
                <div class="flex flex-wrap items-center gap-3 p-5">
                    <Button type="button" variant="outline" disabled>
                        <Upload class="size-4" />
                        Import from package
                    </Button>
                    <span class="text-xs text-muted-foreground">Coming soon</span>
                </div>
            </section>

            <!-- Footer actions -->
            <div class="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" :disabled="submitting" @click="cancel">
                    Cancel
                </Button>
                <Button type="submit" :disabled="submitting">
                    <Loader2 v-if="submitting" class="size-4 animate-spin" />
                    Create problem
                </Button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { ArrowLeft, Loader2, Upload } from 'lucide-vue-next'
import JSZip from 'jszip'
import { Button } from '@/components/ui/button'
import ProblemFormFields, { type ProblemFormValue } from '@/components/admin/problem/ProblemFormFields.vue'
import TestCaseEditor, { type TestCasePair } from '@/components/admin/problem/TestCaseEditor.vue'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import problemService, { buildProblemFormData } from '@/services/problemService'
import type { CreateProblemPayload } from '@/types/problem'

const router = useRouter()
const { triggerToast } = useToast()

const emptyPayload = (): ProblemFormValue => ({
    title: '',
    problemSlug: '',
    subject: '',
    description: '',
    timeLimit: 1000,
    memoryLimit: 256,
    hardnessLevel: 1,
    inputDescription: '',
    outputDescription: '',
    sampleInput: '',
    sampleOutput: '',
    hint: '',
    status: 1,
})

const payload = ref<ProblemFormValue>(emptyPayload())
const testCases = ref<TestCasePair[]>([{ input: '', output: '' }])
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

// Rich-text fields carry HTML; an "empty" editor still emits <p></p>, so strip
// tags before checking. Plain fields have no tags, so this is a no-op for them.
const isBlank = (value: string): boolean =>
    !value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()

const validate = (): boolean => {
    const e: Record<string, string> = {}
    const p = payload.value
    if (isBlank(p.title)) e.title = 'Title is required.'
    if (!p.problemSlug.trim()) e.problemSlug = 'Slug is required.'
    else if (!/^[a-zA-Z0-9-]+$/.test(p.problemSlug)) e.problemSlug = 'Use letters, numbers and hyphens only.'
    if (isBlank(p.subject)) e.subject = 'Subject is required.'
    if (!(Number(p.timeLimit) >= 1)) e.timeLimit = 'Must be at least 1 ms.'
    if (!(Number(p.memoryLimit) >= 1)) e.memoryLimit = 'Must be at least 1 MB.'
    if (!(Number(p.hardnessLevel) >= 1)) e.hardnessLevel = 'Choose a difficulty.'
    if (isBlank(p.description)) e.description = 'Description is required.'
    if (isBlank(p.inputDescription)) e.inputDescription = 'Input description is required.'
    if (isBlank(p.outputDescription)) e.outputDescription = 'Output description is required.'
    if (isBlank(p.sampleInput)) e.sampleInput = 'Sample input is required.'
    if (isBlank(p.sampleOutput)) e.sampleOutput = 'Sample output is required.'
    const completeCases = testCases.value.filter(
        (tc) => tc.input.trim() !== '' && tc.output.trim() !== '',
    )
    if (completeCases.length === 0) {
        e.testCases = 'Add at least one complete test case (input and output).'
    }
    errors.value = e
    return Object.keys(e).length === 0
}

const cancel = () => router.push({ name: 'AdminProblems' })

const onSubmit = async () => {
    if (!validate()) {
        triggerToast('Please fix the highlighted fields.', 'error')
        return
    }

    submitting.value = true
    try {
        const p = payload.value
        const dto: CreateProblemPayload = {
            title: p.title.trim(),
            problemSlug: p.problemSlug.trim(),
            subject: p.subject.trim(),
            description: p.description || undefined,
            timeLimit: Number(p.timeLimit),
            memoryLimit: Number(p.memoryLimit),
            hardnessLevel: Number(p.hardnessLevel),
            inputDescription: p.inputDescription,
            outputDescription: p.outputDescription,
            sampleInput: p.sampleInput,
            sampleOutput: p.sampleOutput,
            hint: p.hint || undefined,
            status: Number(p.status),
        }

        // Zip the input/output pairs client-side as 1.in/1.out, 2.in/2.out, …
        // (1-based) — the format the create endpoint's extractor pairs by base name.
        const zip = new JSZip()
        testCases.value
            .filter((tc) => tc.input.trim() !== '' && tc.output.trim() !== '')
            .forEach((tc, i) => {
                const n = i + 1
                zip.file(`${n}.in`, tc.input)
                zip.file(`${n}.out`, tc.output)
            })
        const blob = await zip.generateAsync({ type: 'blob' })
        const file = new File([blob], `${dto.problemSlug || 'testcases'}.zip`, { type: 'application/zip' })

        await problemService.create(buildProblemFormData(dto, file))
        triggerToast('Problem created', 'success')
        router.push({ name: 'AdminProblemDetail', params: { slug: dto.problemSlug } })
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not create the problem.'), 'error')
    } finally {
        submitting.value = false
    }
}
</script>
