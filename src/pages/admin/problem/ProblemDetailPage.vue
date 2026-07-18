<template>
    <div class="flex w-full flex-col gap-[22px]">
        <!-- Back link -->
        <RouterLink
            :to="{ name: 'AdminProblems' }"
            class="inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <ArrowLeft class="size-4" />
            Problems
        </RouterLink>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col gap-[22px]">
            <div class="h-8 w-1/2 rounded bg-muted animate-ojpulse" />
            <div class="h-[72px] w-full rounded-xl bg-muted animate-ojpulse" />
            <div class="h-40 w-full rounded-xl bg-muted animate-ojpulse" />
            <div class="h-40 w-full rounded-xl bg-muted animate-ojpulse" />
        </div>

        <!-- Error / not found -->
        <div v-else-if="loadError || !problem" class="rounded-xl border border-border bg-card p-[18px]">
            <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-12 text-center">
                <TriangleAlert class="size-6 text-err" />
                <p class="text-sm font-medium text-foreground">Couldn't load this problem.</p>
                <p class="max-w-xs text-xs text-muted-foreground">
                    It may have been removed, or the request failed. Try again or head back to the list.
                </p>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="fetchProblem">
                        <RefreshCw class="size-4" />
                        Retry
                    </Button>
                    <RouterLink :to="{ name: 'AdminProblems' }">
                        <Button size="sm">Back to problems</Button>
                    </RouterLink>
                </div>
            </div>
        </div>

        <!-- Edit mode — form constrained for readability; view mode stays full-width -->
        <template v-else-if="isEditing">
            <div class="flex w-full flex-col gap-[22px]">
                <div class="min-w-0">
                    <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Edit problem</h1>
                    <p class="mt-1 text-sm text-muted-foreground">
                        Update this problem. The slug and test cases stay as they are.
                    </p>
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="save">
                    <ProblemFormFields v-model="editPayload" mode="edit" :errors="errors" />

                    <div class="flex items-center justify-end gap-2 border-t border-border pt-4">
                        <Button type="button" variant="outline" :disabled="submitting" @click="cancelEdit">
                            Cancel
                        </Button>
                        <Button type="submit" :disabled="submitting">
                            <Loader2 v-if="submitting" class="size-4 animate-spin" />
                            Save changes
                        </Button>
                    </div>
                </form>
            </div>
        </template>

        <!-- View mode -->
        <template v-else>
            <!-- Header -->
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0 space-y-2">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">
                            {{ problem.title }}
                        </h1>
                        <Badge variant="outline" class="gap-1.5">
                            <span class="size-1.5 rounded-full" :class="statusDotClass(problem.status)" />
                            {{ statusLabel(problem.status) }}
                        </Badge>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        <span class="font-mono text-foreground">{{ problem.problemSlug }}</span>
                        <span aria-hidden="true">·</span>
                        <span class="font-mono">{{ shortId(problem.id) }}</span>
                        <span aria-hidden="true">·</span>
                        <span class="capitalize">{{ difficultyLabel(problem.hardnessLevel) }}</span>
                    </div>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                    <Button v-if="canUpdate" variant="outline" @click="startEdit">
                        <Pencil class="size-4" />
                        Edit
                    </Button>
                    <Button
                        v-if="canDelete"
                        variant="outline"
                        class="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        @click="deleteOpen = true"
                    >
                        <Trash2 class="size-4" />
                        Delete
                    </Button>
                </div>
            </div>

            <!-- Metadata strip -->
            <div class="flex flex-wrap gap-x-10 gap-y-3 rounded-xl border border-border bg-card p-[18px]">
                <div>
                    <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Time limit</p>
                    <p class="mt-0.5 font-mono text-sm text-foreground">{{ problem.timeLimit }} ms</p>
                </div>
                <div>
                    <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Memory limit</p>
                    <p class="mt-0.5 font-mono text-sm text-foreground">{{ problem.memoryLimit }} MB</p>
                </div>
                <div>
                    <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Updated</p>
                    <p class="mt-0.5 font-mono text-sm text-foreground">{{ relativeTime(problem.updatedAt) }}</p>
                </div>
            </div>

            <!-- Subject -->
            <section v-if="hasText(problem.subject)" class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Subject</h3>
                </div>
                <div class="p-5">
                    <p class="text-sm leading-relaxed text-foreground">{{ problem.subject }}</p>
                </div>
            </section>

            <!-- Description -->
            <section v-if="hasHtml(problem.description)" class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Description</h3>
                </div>
                <div class="p-5">
                    <RichTextEditor :model-value="problem.description" :editable="false" />
                </div>
            </section>

            <!-- Input -->
            <section v-if="hasHtml(problem.inputDescription)" class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Input</h3>
                </div>
                <div class="p-5">
                    <RichTextEditor :model-value="problem.inputDescription" :editable="false" />
                </div>
            </section>

            <!-- Output -->
            <section v-if="hasHtml(problem.outputDescription)" class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Output</h3>
                </div>
                <div class="p-5">
                    <RichTextEditor :model-value="problem.outputDescription" :editable="false" />
                </div>
            </section>

            <!-- Samples -->
            <section
                v-if="hasText(problem.sampleInput) || hasText(problem.sampleOutput)"
                class="rounded-xl border border-border bg-card"
            >
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Samples</h3>
                </div>
                <div class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                    <div v-if="hasText(problem.sampleInput)" class="space-y-1.5">
                        <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sample input</p>
                        <pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">{{ problem.sampleInput }}</pre>
                    </div>
                    <div v-if="hasText(problem.sampleOutput)" class="space-y-1.5">
                        <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sample output</p>
                        <pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">{{ problem.sampleOutput }}</pre>
                    </div>
                </div>
            </section>

            <!-- Test cases (live management panel; requires problem:update) -->
            <TestCaseManager
                v-if="canUpdate"
                :slug="problem.problemSlug ?? String(route.params.slug)"
                :can-manage="canUpdate"
            />

            <!-- Hint -->
            <section v-if="hasHtml(problem.hint)" class="rounded-xl border border-border bg-card">
                <div class="border-b border-border px-5 py-3.5">
                    <h3 class="text-base font-medium text-foreground">Hint</h3>
                </div>
                <div class="p-5">
                    <RichTextEditor :model-value="problem.hint" :editable="false" />
                </div>
            </section>
        </template>

        <!-- Delete confirm -->
        <Dialog v-model:open="deleteOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete problem?</DialogTitle>
                    <DialogDescription>
                        This permanently removes the problem and its test cases. This can't be undone.
                    </DialogDescription>
                </DialogHeader>
                <div v-if="problem" class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="truncate text-sm font-medium text-foreground">{{ problem.title }}</p>
                    <p class="truncate font-mono text-xs text-muted-foreground">{{ problem.problemSlug }}</p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="deleting" @click="deleteOpen = false">
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" :disabled="deleting" @click="confirmDelete">
                        <Loader2 v-if="deleting" class="size-4 animate-spin" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { ArrowLeft, Pencil, Trash2, Loader2, TriangleAlert, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import ProblemFormFields, { type ProblemFormValue } from '@/components/admin/problem/ProblemFormFields.vue'
import TestCaseManager from '@/components/admin/problem/TestCaseManager.vue'
import RichTextEditor from '@/components/admin/editor/RichTextEditor.vue'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import problemService from '@/services/problemService'
import { useAuthStore } from '@/stores/auth'
import type { Problem, UpdateProblemPayload } from '@/types/problem'
import { shortId, difficultyLabel, statusLabel, statusDotClass, relativeTime } from '@/lib/problemDisplay'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { triggerToast } = useToast()

const canUpdate = computed(() => authStore.hasPermission('problem:update'))
const canDelete = computed(() => authStore.hasPermission('problem:delete'))

const problem = ref<Problem | null>(null)
const loading = ref(false)
const loadError = ref(false)
// Deep-link into edit mode from the list (?edit=1); only honour it if allowed.
const isEditing = ref(route.query.edit === '1' && canUpdate.value)

let controller: AbortController | null = null

const fromProblem = (p: Problem): ProblemFormValue => ({
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

const editPayload = ref<ProblemFormValue>(fromProblem({} as Problem))
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

const deleteOpen = ref(false)
const deleting = ref(false)

// Rich-text presence check: an "empty" editor still holds <p></p>.
const hasHtml = (value?: string): boolean =>
    !!value && !!value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()
const hasText = (value?: string): boolean => !!value && !!value.trim()
const isBlank = (value: string): boolean => !hasHtml(value)

const fetchProblem = async () => {
    const slug = String(route.params.slug || '')
    if (!slug) return
    controller?.abort()
    const ac = new AbortController()
    controller = ac
    loading.value = true
    loadError.value = false
    try {
        const res = await problemService.getProblemBySlug(ac.signal, slug)
        if (controller !== ac) return
        problem.value = res.data.data
        editPayload.value = fromProblem(res.data.data)
    } catch (err) {
        if (controller !== ac || axios.isCancel(err)) return
        problem.value = null
        loadError.value = true
    } finally {
        if (controller === ac) loading.value = false
    }
}

const startEdit = () => {
    if (problem.value) editPayload.value = fromProblem(problem.value)
    errors.value = {}
    isEditing.value = true
}

const cancelEdit = () => {
    if (problem.value) editPayload.value = fromProblem(problem.value)
    errors.value = {}
    isEditing.value = false
}

const validate = (): boolean => {
    const e: Record<string, string> = {}
    const p = editPayload.value
    if (isBlank(p.title)) e.title = 'Title is required.'
    if (isBlank(p.subject)) e.subject = 'Subject is required.'
    if (!(Number(p.timeLimit) >= 1)) e.timeLimit = 'Must be at least 1 ms.'
    if (!(Number(p.memoryLimit) >= 1)) e.memoryLimit = 'Must be at least 1 MB.'
    if (!(Number(p.hardnessLevel) >= 1)) e.hardnessLevel = 'Choose a difficulty.'
    if (isBlank(p.description)) e.description = 'Description is required.'
    if (isBlank(p.inputDescription)) e.inputDescription = 'Input description is required.'
    if (isBlank(p.outputDescription)) e.outputDescription = 'Output description is required.'
    if (isBlank(p.sampleInput)) e.sampleInput = 'Sample input is required.'
    if (isBlank(p.sampleOutput)) e.sampleOutput = 'Sample output is required.'
    errors.value = e
    return Object.keys(e).length === 0
}

const save = async () => {
    if (!validate()) {
        triggerToast('Please fix the highlighted fields.', 'error')
        return
    }
    submitting.value = true
    try {
        const p = editPayload.value
        const dto: UpdateProblemPayload = {
            title: p.title.trim(),
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
        await problemService.update(String(route.params.slug), dto)
        triggerToast('Problem updated', 'success')
        await fetchProblem()
        isEditing.value = false
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not save changes.'), 'error')
    } finally {
        submitting.value = false
    }
}

const confirmDelete = async () => {
    deleting.value = true
    try {
        await problemService.remove(String(route.params.slug))
        triggerToast('Problem deleted', 'success')
        deleteOpen.value = false
        router.push({ name: 'AdminProblems' })
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not delete the problem.'), 'error')
    } finally {
        deleting.value = false
    }
}

// Refetch when navigating between problems on the same component instance.
watch(
    () => route.params.slug,
    () => {
        isEditing.value = route.query.edit === '1' && canUpdate.value
        fetchProblem()
    },
)

onMounted(fetchProblem)
</script>
