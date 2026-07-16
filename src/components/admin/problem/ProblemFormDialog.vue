<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <form class="flex min-h-0 flex-col" novalidate @submit.prevent="onSubmit">
                <!-- Header (fixed) -->
                <DialogHeader class="border-b border-border px-6 py-4 text-left">
                    <DialogTitle class="text-lg">
                        {{ mode === 'create' ? 'Create problem' : 'Edit problem' }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ mode === 'create'
                            ? 'Add a problem to the catalog. Fields marked * are required.'
                            : 'Update this problem. The slug and test cases stay as they are.' }}
                    </DialogDescription>
                </DialogHeader>

                <!-- Body (scrollable) -->
                <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <!-- Title -->
                    <div class="space-y-1.5">
                        <Label for="pf-title">Title <span class="text-destructive">*</span></Label>
                        <Input
                            id="pf-title"
                            v-model="form.title"
                            placeholder="Two Sum"
                            :aria-invalid="!!errors.title || undefined"
                        />
                        <p v-if="errors.title" class="text-xs text-destructive">{{ errors.title }}</p>
                    </div>

                    <!-- Slug (create only) -->
                    <div v-if="mode === 'create'" class="space-y-1.5">
                        <Label for="pf-slug">Slug <span class="text-destructive">*</span></Label>
                        <Input
                            id="pf-slug"
                            v-model="form.problemSlug"
                            placeholder="two-sum"
                            class="font-mono"
                            :aria-invalid="!!errors.problemSlug || undefined"
                        />
                        <p v-if="errors.problemSlug" class="text-xs text-destructive">{{ errors.problemSlug }}</p>
                        <p v-else class="text-xs text-muted-foreground">Letters, numbers and hyphens only. Can't be changed later.</p>
                    </div>

                    <!-- Subject -->
                    <div class="space-y-1.5">
                        <Label for="pf-subject">Subject <span class="text-destructive">*</span></Label>
                        <Textarea
                            id="pf-subject"
                            v-model="form.subject"
                            rows="2"
                            placeholder="A short one-line summary of the problem."
                            :aria-invalid="!!errors.subject || undefined"
                        />
                        <p v-if="errors.subject" class="text-xs text-destructive">{{ errors.subject }}</p>
                    </div>

                    <!-- Description -->
                    <div class="space-y-1.5">
                        <Label for="pf-description">Description</Label>
                        <Textarea
                            id="pf-description"
                            v-model="form.description"
                            rows="4"
                            placeholder="The full statement (Markdown supported)."
                        />
                    </div>

                    <!-- Limits + difficulty + status -->
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="space-y-1.5">
                            <Label for="pf-time">Time limit (ms) <span class="text-destructive">*</span></Label>
                            <Input
                                id="pf-time"
                                v-model="form.timeLimit"
                                type="number"
                                min="1"
                                class="font-mono"
                                :aria-invalid="!!errors.timeLimit || undefined"
                            />
                            <p v-if="errors.timeLimit" class="text-xs text-destructive">{{ errors.timeLimit }}</p>
                        </div>

                        <div class="space-y-1.5">
                            <Label for="pf-memory">Memory limit (MB) <span class="text-destructive">*</span></Label>
                            <Input
                                id="pf-memory"
                                v-model="form.memoryLimit"
                                type="number"
                                min="1"
                                class="font-mono"
                                :aria-invalid="!!errors.memoryLimit || undefined"
                            />
                            <p v-if="errors.memoryLimit" class="text-xs text-destructive">{{ errors.memoryLimit }}</p>
                        </div>

                        <div class="space-y-1.5">
                            <Label for="pf-difficulty">Difficulty <span class="text-destructive">*</span></Label>
                            <Select
                                :model-value="String(form.hardnessLevel)"
                                @update:model-value="(v) => (form.hardnessLevel = Number(v))"
                            >
                                <SelectTrigger id="pf-difficulty" class="w-full">
                                    <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Easy</SelectItem>
                                    <SelectItem value="2">Medium</SelectItem>
                                    <SelectItem value="3">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div class="space-y-1.5">
                            <Label for="pf-status">Status</Label>
                            <Select
                                :model-value="String(form.status)"
                                @update:model-value="(v) => (form.status = Number(v))"
                            >
                                <SelectTrigger id="pf-status" class="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <!-- Input / output descriptions -->
                    <div class="space-y-1.5">
                        <Label for="pf-input-desc">Input description <span class="text-destructive">*</span></Label>
                        <Textarea
                            id="pf-input-desc"
                            v-model="form.inputDescription"
                            rows="3"
                            placeholder="Describe the input format."
                            :aria-invalid="!!errors.inputDescription || undefined"
                        />
                        <p v-if="errors.inputDescription" class="text-xs text-destructive">{{ errors.inputDescription }}</p>
                    </div>

                    <div class="space-y-1.5">
                        <Label for="pf-output-desc">Output description <span class="text-destructive">*</span></Label>
                        <Textarea
                            id="pf-output-desc"
                            v-model="form.outputDescription"
                            rows="3"
                            placeholder="Describe the expected output."
                            :aria-invalid="!!errors.outputDescription || undefined"
                        />
                        <p v-if="errors.outputDescription" class="text-xs text-destructive">{{ errors.outputDescription }}</p>
                    </div>

                    <!-- Sample input / output -->
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="space-y-1.5">
                            <Label for="pf-sample-in">Sample input <span class="text-destructive">*</span></Label>
                            <Textarea
                                id="pf-sample-in"
                                v-model="form.sampleInput"
                                rows="3"
                                class="font-mono"
                                placeholder="2 7 11 15"
                                :aria-invalid="!!errors.sampleInput || undefined"
                            />
                            <p v-if="errors.sampleInput" class="text-xs text-destructive">{{ errors.sampleInput }}</p>
                        </div>

                        <div class="space-y-1.5">
                            <Label for="pf-sample-out">Sample output <span class="text-destructive">*</span></Label>
                            <Textarea
                                id="pf-sample-out"
                                v-model="form.sampleOutput"
                                rows="3"
                                class="font-mono"
                                placeholder="0 1"
                                :aria-invalid="!!errors.sampleOutput || undefined"
                            />
                            <p v-if="errors.sampleOutput" class="text-xs text-destructive">{{ errors.sampleOutput }}</p>
                        </div>
                    </div>

                    <!-- Hint -->
                    <div class="space-y-1.5">
                        <Label for="pf-hint">Hint</Label>
                        <Textarea
                            id="pf-hint"
                            v-model="form.hint"
                            rows="2"
                            placeholder="An optional nudge for solvers."
                        />
                    </div>

                    <!-- Test cases file (create only) -->
                    <div v-if="mode === 'create'" class="space-y-1.5">
                        <Label for="pf-file">Test cases (file) <span class="text-destructive">*</span></Label>
                        <input
                            id="pf-file"
                            ref="fileInputRef"
                            type="file"
                            :aria-invalid="!!errors.file || undefined"
                            class="block w-full rounded-md border border-input bg-transparent text-sm text-muted-foreground shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-input file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20"
                            @change="onFileChange"
                        >
                        <p v-if="errors.file" class="text-xs text-destructive">{{ errors.file }}</p>
                        <p v-else class="text-xs text-muted-foreground">
                            An archive of test cases. Required to create a problem.
                        </p>
                    </div>
                </div>

                <!-- Footer (fixed) -->
                <DialogFooter class="border-t border-border px-6 py-4">
                    <Button type="button" variant="outline" :disabled="submitting" @click="onOpenChange(false)">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="submitting">
                        <Loader2 v-if="submitting" class="size-4 animate-spin" />
                        {{ mode === 'create' ? 'Create problem' : 'Save changes' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/composables/useToast'
import problemService, { buildProblemFormData } from '@/services/problemService'
import type { Problem, CreateProblemPayload, UpdateProblemPayload } from '@/types/problem'

const props = defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    problem?: Problem
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'saved'): void
}>()

const { triggerToast } = useToast()

interface FormState {
    title: string
    problemSlug: string
    subject: string
    description: string
    // number inputs surface strings from the DOM; coerced on submit
    timeLimit: number | string
    memoryLimit: number | string
    hardnessLevel: number
    inputDescription: string
    outputDescription: string
    sampleInput: string
    sampleOutput: string
    hint: string
    status: number
}

const emptyForm = (): FormState => ({
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

const fromProblem = (p: Problem): FormState => ({
    title: p.title ?? '',
    problemSlug: p.problemSlug ?? '',
    subject: p.subject ?? '',
    description: p.description ?? '',
    timeLimit: p.timeLimit ?? 1000,
    memoryLimit: p.memoryLimit ?? 256,
    hardnessLevel: p.hardnessLevel ?? 1,
    inputDescription: p.inputDescription ?? '',
    outputDescription: p.outputDescription ?? '',
    sampleInput: p.sampleInput ?? '',
    sampleOutput: p.sampleOutput ?? '',
    hint: p.hint ?? '',
    status: p.status ?? 1,
})

const form = reactive<FormState>(emptyForm())
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)

const onFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    file.value = target.files?.[0] ?? null
    // Empty string is falsy, so the inline error hides once a file is picked.
    if (file.value) errors.value.file = ''
}

// (Re)initialise the form each time the dialog opens.
watch(
    () => props.open,
    (isOpen) => {
        if (!isOpen) return
        errors.value = {}
        file.value = null
        if (fileInputRef.value) fileInputRef.value.value = ''
        Object.assign(
            form,
            props.mode === 'edit' && props.problem ? fromProblem(props.problem) : emptyForm(),
        )
    },
    { immediate: true },
)

const onOpenChange = (value: boolean) => {
    // Don't let a click-away / ESC discard an in-flight save.
    if (submitting.value && value === false) return
    emit('update:open', value)
}

const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required.'
    if (props.mode === 'create') {
        if (!form.problemSlug.trim()) e.problemSlug = 'Slug is required.'
        else if (!/^[a-zA-Z0-9-]+$/.test(form.problemSlug)) e.problemSlug = 'Use letters, numbers and hyphens only.'
    }
    if (!form.subject.trim()) e.subject = 'Subject is required.'
    if (!(Number(form.timeLimit) >= 1)) e.timeLimit = 'Must be at least 1 ms.'
    if (!(Number(form.memoryLimit) >= 1)) e.memoryLimit = 'Must be at least 1 MB.'
    if (!form.inputDescription.trim()) e.inputDescription = 'Input description is required.'
    if (!form.outputDescription.trim()) e.outputDescription = 'Output description is required.'
    if (!form.sampleInput.trim()) e.sampleInput = 'Sample input is required.'
    if (!form.sampleOutput.trim()) e.sampleOutput = 'Sample output is required.'
    if (props.mode === 'create' && !file.value) e.file = 'A test-case file is required.'
    errors.value = e
    return Object.keys(e).length === 0
}

const buildPayload = (): UpdateProblemPayload => ({
    title: form.title.trim(),
    subject: form.subject,
    description: form.description || undefined,
    timeLimit: Number(form.timeLimit),
    memoryLimit: Number(form.memoryLimit),
    hardnessLevel: Number(form.hardnessLevel),
    inputDescription: form.inputDescription,
    outputDescription: form.outputDescription,
    sampleInput: form.sampleInput,
    sampleOutput: form.sampleOutput,
    hint: form.hint || undefined,
    status: Number(form.status),
})

const onSubmit = async () => {
    if (!validate()) {
        triggerToast('Please fix the highlighted fields.', 'error')
        return
    }

    submitting.value = true
    try {
        if (props.mode === 'create') {
            const payload: CreateProblemPayload = {
                ...buildPayload(),
                problemSlug: form.problemSlug.trim(),
            }
            await problemService.create(buildProblemFormData(payload, file.value as File))
            triggerToast('Problem created', 'success')
        } else {
            await problemService.update(props.problem!.problemSlug, buildPayload())
            triggerToast('Problem updated', 'success')
        }
        emit('saved')
        emit('update:open', false)
    } catch (err: any) {
        const fallback = props.mode === 'create' ? 'Could not create the problem.' : 'Could not save changes.'
        triggerToast(err?.response?.data?.message || fallback, 'error')
    } finally {
        submitting.value = false
    }
}
</script>
