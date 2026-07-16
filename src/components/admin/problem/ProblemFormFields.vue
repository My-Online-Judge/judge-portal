<script lang="ts">
/**
 * Shared, presentational body of the problem form — used by both the create
 * page and the detail page's edit mode. It owns no service calls, no submit
 * button and no navigation; the hosting page validates, builds the payload
 * and drives the actions. Number fields carry `number | string` because the
 * DOM surfaces strings from `<input type="number">`; the page coerces on submit.
 */
export interface ProblemFormValue {
    title: string
    problemSlug: string
    subject: string
    description: string
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
</script>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from '@/components/admin/editor/RichTextEditor.vue'

const props = defineProps<{
    modelValue: ProblemFormValue
    mode: 'create' | 'edit'
    errors?: Record<string, string>
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: ProblemFormValue): void
}>()

// Emit a shallow-merged copy so the parent's v-model stays the source of truth.
const set = <K extends keyof ProblemFormValue>(key: K, value: ProblemFormValue[K]) => {
    emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const errorFor = (key: string) => props.errors?.[key]
const invalid = (key: string) => (props.errors?.[key] ? true : undefined)
</script>

<template>
    <div class="flex flex-col gap-5">
        <!-- Basics -->
        <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-5 py-3.5">
                <h3 class="text-base font-medium text-foreground">Basics</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">Identity, limits and difficulty.</p>
            </div>
            <div class="space-y-4 p-5">
                <!-- Title -->
                <div class="space-y-1.5">
                    <Label for="pf-title">Title <span class="text-destructive">*</span></Label>
                    <Input
                        id="pf-title"
                        :model-value="modelValue.title"
                        placeholder="Two Sum"
                        :aria-invalid="invalid('title')"
                        @update:model-value="(v) => set('title', String(v))"
                    />
                    <p v-if="errorFor('title')" class="text-xs text-destructive">{{ errorFor('title') }}</p>
                </div>

                <!-- Slug (create only) -->
                <div v-if="mode === 'create'" class="space-y-1.5">
                    <Label for="pf-slug">Slug <span class="text-destructive">*</span></Label>
                    <Input
                        id="pf-slug"
                        :model-value="modelValue.problemSlug"
                        placeholder="two-sum"
                        pattern="^[a-zA-Z0-9-]+$"
                        class="font-mono"
                        :aria-invalid="invalid('problemSlug')"
                        @update:model-value="(v) => set('problemSlug', String(v))"
                    />
                    <p v-if="errorFor('problemSlug')" class="text-xs text-destructive">{{ errorFor('problemSlug') }}</p>
                    <p v-else class="text-xs text-muted-foreground">Letters, numbers and hyphens only. Can't be changed later.</p>
                </div>

                <!-- Subject -->
                <div class="space-y-1.5">
                    <Label for="pf-subject">Subject <span class="text-destructive">*</span></Label>
                    <Input
                        id="pf-subject"
                        :model-value="modelValue.subject"
                        placeholder="A short one-line summary of the problem."
                        :aria-invalid="invalid('subject')"
                        @update:model-value="(v) => set('subject', String(v))"
                    />
                    <p v-if="errorFor('subject')" class="text-xs text-destructive">{{ errorFor('subject') }}</p>
                </div>

                <!-- Limits + difficulty + status -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="space-y-1.5">
                        <Label for="pf-time">Time limit (ms) <span class="text-destructive">*</span></Label>
                        <Input
                            id="pf-time"
                            type="number"
                            min="1"
                            class="font-mono"
                            :model-value="modelValue.timeLimit"
                            :aria-invalid="invalid('timeLimit')"
                            @update:model-value="(v) => set('timeLimit', v)"
                        />
                        <p v-if="errorFor('timeLimit')" class="text-xs text-destructive">{{ errorFor('timeLimit') }}</p>
                    </div>

                    <div class="space-y-1.5">
                        <Label for="pf-memory">Memory limit (MB) <span class="text-destructive">*</span></Label>
                        <Input
                            id="pf-memory"
                            type="number"
                            min="1"
                            class="font-mono"
                            :model-value="modelValue.memoryLimit"
                            :aria-invalid="invalid('memoryLimit')"
                            @update:model-value="(v) => set('memoryLimit', v)"
                        />
                        <p v-if="errorFor('memoryLimit')" class="text-xs text-destructive">{{ errorFor('memoryLimit') }}</p>
                    </div>

                    <div class="space-y-1.5">
                        <Label for="pf-difficulty">Difficulty <span class="text-destructive">*</span></Label>
                        <Select
                            :model-value="String(modelValue.hardnessLevel)"
                            @update:model-value="(v) => set('hardnessLevel', Number(v))"
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
                            :model-value="String(modelValue.status)"
                            @update:model-value="(v) => set('status', Number(v))"
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
            </div>
        </section>

        <!-- Statement -->
        <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-5 py-3.5">
                <h3 class="text-base font-medium text-foreground">Statement</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">The full problem statement, shown to solvers.</p>
            </div>
            <div class="space-y-4 p-5">
                <div class="space-y-1.5">
                    <Label>Description <span class="text-destructive">*</span></Label>
                    <RichTextEditor
                        :model-value="modelValue.description"
                        placeholder="Describe the problem. Use headings, lists and code blocks as needed."
                        @update:model-value="(v) => set('description', v)"
                    />
                    <p v-if="errorFor('description')" class="text-xs text-destructive">{{ errorFor('description') }}</p>
                </div>

                <div class="space-y-1.5">
                    <Label>Input description <span class="text-destructive">*</span></Label>
                    <RichTextEditor
                        :model-value="modelValue.inputDescription"
                        placeholder="Describe the input format."
                        @update:model-value="(v) => set('inputDescription', v)"
                    />
                    <p v-if="errorFor('inputDescription')" class="text-xs text-destructive">{{ errorFor('inputDescription') }}</p>
                </div>

                <div class="space-y-1.5">
                    <Label>Output description <span class="text-destructive">*</span></Label>
                    <RichTextEditor
                        :model-value="modelValue.outputDescription"
                        placeholder="Describe the expected output."
                        @update:model-value="(v) => set('outputDescription', v)"
                    />
                    <p v-if="errorFor('outputDescription')" class="text-xs text-destructive">{{ errorFor('outputDescription') }}</p>
                </div>
            </div>
        </section>

        <!-- Samples -->
        <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-5 py-3.5">
                <h3 class="text-base font-medium text-foreground">Samples</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">Plain example input and output.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div class="space-y-1.5">
                    <Label for="pf-sample-in">Sample input <span class="text-destructive">*</span></Label>
                    <Textarea
                        id="pf-sample-in"
                        rows="4"
                        class="font-mono"
                        placeholder="2 7 11 15"
                        :model-value="modelValue.sampleInput"
                        :aria-invalid="invalid('sampleInput')"
                        @update:model-value="(v) => set('sampleInput', String(v))"
                    />
                    <p v-if="errorFor('sampleInput')" class="text-xs text-destructive">{{ errorFor('sampleInput') }}</p>
                </div>

                <div class="space-y-1.5">
                    <Label for="pf-sample-out">Sample output <span class="text-destructive">*</span></Label>
                    <Textarea
                        id="pf-sample-out"
                        rows="4"
                        class="font-mono"
                        placeholder="0 1"
                        :model-value="modelValue.sampleOutput"
                        :aria-invalid="invalid('sampleOutput')"
                        @update:model-value="(v) => set('sampleOutput', String(v))"
                    />
                    <p v-if="errorFor('sampleOutput')" class="text-xs text-destructive">{{ errorFor('sampleOutput') }}</p>
                </div>
            </div>
        </section>

        <!-- Hint -->
        <section class="rounded-xl border border-border bg-card">
            <div class="border-b border-border px-5 py-3.5">
                <h3 class="text-base font-medium text-foreground">Hint</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">An optional nudge for solvers.</p>
            </div>
            <div class="p-5">
                <div class="space-y-1.5">
                    <Label>Hint</Label>
                    <RichTextEditor
                        :model-value="modelValue.hint"
                        placeholder="Optional — a gentle hint toward the intended approach."
                        @update:model-value="(v) => set('hint', v)"
                    />
                    <p v-if="errorFor('hint')" class="text-xs text-destructive">{{ errorFor('hint') }}</p>
                </div>
            </div>
        </section>
    </div>
</template>
