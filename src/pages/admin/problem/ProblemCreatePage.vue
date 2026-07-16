<template>
    <div class="mx-auto flex w-full max-w-[900px] flex-col gap-[22px]">
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
                @update:file="file = $event"
            />

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
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ProblemFormFields, { type ProblemFormValue } from '@/components/admin/problem/ProblemFormFields.vue'
import { useToast } from '@/composables/useToast'
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
const file = ref<File | null>(null)
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
    if (!file.value) e.file = 'A test-case file is required.'
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
        await problemService.create(buildProblemFormData(dto, file.value as File))
        triggerToast('Problem created', 'success')
        router.push({ name: 'AdminProblemDetail', params: { slug: dto.problemSlug } })
    } catch (err: any) {
        triggerToast(err?.response?.data?.message || 'Could not create the problem.', 'error')
    } finally {
        submitting.value = false
    }
}
</script>
