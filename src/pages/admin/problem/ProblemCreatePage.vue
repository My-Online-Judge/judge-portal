<template>
    <div class="flex w-full flex-col gap-[18px]">
        <PageHeader
            title="Create problem"
            description="Add a problem to the catalog. Fields marked * are required."
            :breadcrumbs="[
                { label: 'Admin', to: { name: 'AdminDashboard' } },
                { label: 'Problems', to: { name: 'AdminProblems' } },
                { label: 'New' },
            ]"
        />

        <!-- Form -->
        <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
            <ProblemFormFields
                v-model="payload"
                mode="create"
                :errors="errors"
            />

            <!-- Test cases -->
            <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="create-tc">
                <div class="border-b border-border px-3.5 py-3">
                    <h3 id="create-tc" class="text-sm font-semibold text-foreground">Test cases <span class="text-destructive-ink">*</span></h3>
                    <p class="mt-0.5 text-xs text-muted-foreground">Add at least one input and output pair. These become the judge's test data.</p>
                </div>
                <div class="flex flex-col gap-3 p-4">
                    <TestCaseEditor v-model="testCases" />
                    <p v-if="errors.testCases" class="text-xs text-destructive-ink">{{ errors.testCases }}</p>
                </div>
            </section>

            <!-- Import problem (not built yet) -->
            <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="create-import">
                <div class="border-b border-border px-3.5 py-3">
                    <h3 id="create-import" class="text-sm font-semibold text-foreground">Import problem</h3>
                    <p class="mt-0.5 text-xs text-muted-foreground">Create a problem from an exported package instead of filling the form.</p>
                </div>
                <div class="flex flex-wrap items-center gap-3 p-4">
                    <Button type="button" variant="secondary" disabled>
                        <Upload class="size-4" />
                        Import from package
                    </Button>
                    <span class="text-xs text-muted-foreground">Coming soon</span>
                </div>
            </section>

            <!-- Footer actions -->
            <div class="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="secondary" :disabled="submitting" @click="cancel">
                    Cancel
                </Button>
                <Button type="submit" :disabled="submitting">
                    <Loader2 v-if="submitting" class="size-4 animate-spin" />
                    Create problem
                </Button>
            </div>
        </form>

        <UnsavedChangesBar
            :dirty="dirty"
            :summary="dirtySummary"
            :saving="submitting"
            @save="onSubmit"
            @discard="discard"
        />

        <ConfirmDialog
            v-model:open="confirmOpen"
            title="Leave without saving?"
            description="This problem hasn't been created yet. What you've entered is lost."
            confirm-label="Leave"
            cancel-label="Stay"
            tone="neutral"
            @confirm="confirmLeave"
            @update:open="(v: boolean) => { if (!v) cancelLeave() }"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Upload } from 'lucide-vue-next'
import JSZip from 'jszip'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import UnsavedChangesBar from '@/components/common/UnsavedChangesBar.vue'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
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
    tags: [],
})

const payload = ref<ProblemFormValue>(emptyPayload())
const testCases = ref<TestCasePair[]>([{ input: '', output: '' }])
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const created = ref(false)

const initialTestCases = (): TestCasePair[] => [{ input: '', output: '' }]
const initialPayloadJson = JSON.stringify(payload.value)
const initialCasesJson = JSON.stringify(testCases.value)
const formDirty = computed(() => JSON.stringify(payload.value) !== initialPayloadJson)
const casesDirty = computed(() => JSON.stringify(testCases.value) !== initialCasesJson)
const dirty = computed(() => !created.value && (formDirty.value || casesDirty.value))
const dirtySummary = computed(() => {
    if (formDirty.value && casesDirty.value) return 'in the problem and its test cases'
    if (casesDirty.value) return 'in the test cases'
    return 'in the problem'
})
const { confirmOpen, confirmLeave, cancelLeave } = useDiscardGuard(() => dirty.value)

const discard = () => {
    payload.value = emptyPayload()
    testCases.value = initialTestCases()
    errors.value = {}
}

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
    if (submitting.value) return
    if (!validate()) {
        triggerToast('Fix the highlighted fields', 'error')
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
            tags: p.tags,
        }

        // Zip the input/output pairs client-side as 1.in/1.out, 2.in/2.out, …
        // (1-based): the format the create endpoint's extractor pairs by base name.
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
        created.value = true
        triggerToast('Problem created', 'success')
        router.push({ name: 'AdminProblemDetail', params: { slug: dto.problemSlug } })
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not create the problem.'), 'error')
    } finally {
        submitting.value = false
    }
}
</script>
