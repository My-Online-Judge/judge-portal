<template>
    <div class="flex w-full flex-col gap-[18px]">
        <!-- Loading -->
        <div v-if="loading" class="flex flex-col gap-[18px]" aria-busy="true">
            <span class="sk h-3 w-48" />
            <span class="sk h-7 w-1/2" />
            <span class="sk h-[72px] w-full rounded-xl" />
            <span class="sk h-40 w-full rounded-xl" />
            <span class="sk h-40 w-full rounded-xl" />
        </div>

        <!-- Error / not found -->
        <template v-else-if="loadError || !problem">
            <PageHeader title="Problem" />
            <div class="rounded-xl border border-border bg-card p-[18px]">
                <div role="alert" class="flex min-h-60 flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
                    <span class="grid size-10 place-items-center rounded-xl bg-destructive-soft text-destructive-ink">
                        <CloudOff class="size-5" aria-hidden="true" />
                    </span>
                    <h2 class="text-sm font-semibold text-foreground">Couldn't load this problem</h2>
                    <p class="max-w-xs text-sm text-muted-foreground">
                        It may have been removed, or the request failed. Try again, or go back to the list.
                    </p>
                    <div class="flex items-center gap-2">
                        <Button variant="secondary" size="sm" @click="fetchProblem">
                            <RotateCw class="size-4" />
                            Retry
                        </Button>
                        <Button as-child size="sm">
                            <RouterLink :to="{ name: 'AdminProblems' }">Back to problems</RouterLink>
                        </Button>
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
            <PageHeader :title="problem.title">
                <template v-if="!isEditing" #actions>
                    <Button variant="secondary" as-child>
                        <RouterLink :to="`/problems/${problem.problemSlug}`">
                            <ExternalLink class="size-4" />
                            View as student
                        </RouterLink>
                    </Button>
                    <Button v-if="canUpdate" variant="secondary" @click="startEdit">
                        <Pencil class="size-4" />
                        Edit
                    </Button>
                    <Button v-if="canDelete" variant="secondary" @click="deleteOpen = true">
                        <Trash2 class="size-4" />
                        Delete problem
                    </Button>
                </template>
            </PageHeader>

            <!-- Facts under the title -->
            <div class="meta-strip text-[13px] text-muted-foreground">
                <span><DifficultyBadge :level="problem.hardnessLevel" /></span>
                <span>
                    <Badge v-if="problem.status === 1" variant="success">Active</Badge>
                    <Badge v-else variant="neutral">
                        <EyeOff aria-hidden="true" />
                        Inactive
                    </Badge>
                </span>
                <span>Time limit <b class="font-mono font-medium text-foreground">{{ problem.timeLimit }} ms</b></span>
                <span>Memory limit <b class="font-mono font-medium text-foreground">{{ problem.memoryLimit }} MB</b></span>
                <span>Updated <span class="text-foreground">{{ relativeTime(problem.updatedAt) }}</span></span>
            </div>

            <!-- Edit mode -->
            <form v-if="isEditing" class="flex flex-col gap-4" novalidate @submit.prevent="save">
                <ProblemFormFields v-model="editPayload" mode="edit" :errors="errors" />

                <div class="flex items-center justify-end gap-2 border-t border-border pt-4">
                    <Button type="button" variant="secondary" :disabled="submitting" @click="requestCancelEdit">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="submitting">
                        <Loader2 v-if="submitting" class="size-4 animate-spin" />
                        Save changes
                    </Button>
                </div>
            </form>

            <!-- View mode -->
            <template v-else>
                <section v-if="hasText(problem.subject)" :class="cardClass">
                    <h3 :class="cardHeadClass">Subject</h3>
                    <div class="p-4">
                        <p class="text-sm leading-relaxed text-foreground">{{ problem.subject }}</p>
                    </div>
                </section>

                <section v-if="hasHtml(problem.description)" :class="cardClass">
                    <h3 :class="cardHeadClass">Statement</h3>
                    <div class="p-4">
                        <RichTextEditor :model-value="problem.description" :editable="false" />
                    </div>
                </section>

                <div
                    v-if="hasHtml(problem.inputDescription) || hasHtml(problem.outputDescription)"
                    class="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    <section v-if="hasHtml(problem.inputDescription)" :class="cardClass">
                        <h3 :class="cardHeadClass">Input</h3>
                        <div class="p-4">
                            <RichTextEditor :model-value="problem.inputDescription" :editable="false" />
                        </div>
                    </section>
                    <section v-if="hasHtml(problem.outputDescription)" :class="cardClass">
                        <h3 :class="cardHeadClass">Output</h3>
                        <div class="p-4">
                            <RichTextEditor :model-value="problem.outputDescription" :editable="false" />
                        </div>
                    </section>
                </div>

                <section v-if="hasText(problem.sampleInput) || hasText(problem.sampleOutput)" :class="cardClass">
                    <h3 :class="cardHeadClass">Samples</h3>
                    <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                        <div v-if="hasText(problem.sampleInput)" class="flex flex-col gap-1.5">
                            <p class="text-xs font-medium text-muted-foreground">Sample input</p>
                            <pre class="overflow-x-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-xs break-words whitespace-pre-wrap text-foreground">{{ problem.sampleInput }}</pre>
                        </div>
                        <div v-if="hasText(problem.sampleOutput)" class="flex flex-col gap-1.5">
                            <p class="text-xs font-medium text-muted-foreground">Sample output</p>
                            <pre class="overflow-x-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-xs break-words whitespace-pre-wrap text-foreground">{{ problem.sampleOutput }}</pre>
                        </div>
                    </div>
                </section>

                <!-- Test cases (live management panel; requires problem:update) -->
                <TestCaseManager
                    v-if="canUpdate"
                    :slug="problem.problemSlug ?? String(route.params.slug)"
                    :can-manage="canUpdate"
                />

                <!-- Checker (special judge; requires problem:update) -->
                <CheckerCard v-if="canUpdate" :slug="problem.problemSlug ?? String(route.params.slug)" />

                <section v-if="hasHtml(problem.hint)" :class="cardClass">
                    <h3 :class="cardHeadClass">Hint</h3>
                    <div class="p-4">
                        <RichTextEditor :model-value="problem.hint" :editable="false" />
                    </div>
                </section>
            </template>
        </template>

        <UnsavedChangesBar
            :dirty="editDirty"
            summary="in this problem"
            :saving="submitting"
            @save="save"
            @discard="discardEdits"
        />

        <!-- Delete confirm -->
        <ConfirmDialog
            v-model:open="deleteOpen"
            :title="`Delete problem “${problem?.title ?? ''}”?`"
            description="Its test cases are deleted with it."
            confirm-label="Delete problem"
            :busy="deleting"
            @confirm="confirmDelete"
        />

        <!-- Leaving (or cancelling) with unsaved edits -->
        <ConfirmDialog
            :open="confirmOpen || cancelAsk"
            title="Leave without saving?"
            description="Your changes to this problem are lost."
            confirm-label="Leave"
            cancel-label="Stay"
            tone="neutral"
            @confirm="onDiscardConfirm"
            @update:open="(v: boolean) => { if (!v) onDiscardClose() }"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { CloudOff, ExternalLink, EyeOff, Loader2, Pencil, RotateCw, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import UnsavedChangesBar from '@/components/common/UnsavedChangesBar.vue'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
import ProblemFormFields, { type ProblemFormValue } from '@/components/admin/problem/ProblemFormFields.vue'
import CheckerCard from '@/components/admin/problem/CheckerCard.vue'
import TestCaseManager from '@/components/admin/problem/TestCaseManager.vue'
import RichTextEditor from '@/components/admin/editor/RichTextEditor.vue'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import problemService from '@/services/problemService'
import { useAuthStore } from '@/stores/auth'
import type { Problem, UpdateProblemPayload } from '@/types/problem'
import { relativeTime } from '@/lib/problemDisplay'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { triggerToast, success, error: errorToast } = useToast()

const cardClass = 'min-w-0 overflow-hidden rounded-xl border border-border bg-card'
const cardHeadClass = 'border-b border-border px-3.5 py-3 text-sm font-semibold text-foreground'

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
    tags: [...(p.tags ?? [])],
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

const isDirty = () =>
    isEditing.value &&
    !!problem.value &&
    JSON.stringify(editPayload.value) !== JSON.stringify(fromProblem(problem.value))

const { confirmOpen, confirmLeave, cancelLeave } = useDiscardGuard(isDirty)
const cancelAsk = ref(false)
const editDirty = computed(() => isDirty())

// Discard keeps the editor open with the saved values.
const discardEdits = () => {
    if (problem.value) editPayload.value = fromProblem(problem.value)
    errors.value = {}
}

const requestCancelEdit = () => {
    if (isDirty()) cancelAsk.value = true
    else cancelEdit()
}
const onDiscardConfirm = () => {
    if (cancelAsk.value) {
        cancelAsk.value = false
        cancelEdit()
    } else confirmLeave()
}
const onDiscardClose = () => {
    cancelAsk.value = false
    cancelLeave()
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
    if (submitting.value) return
    if (!validate()) {
        triggerToast('Fix the highlighted fields', 'error')
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
            tags: p.tags,
        }
        await problemService.update(String(route.params.slug), dto)
        success('Changes saved', { description: `“${dto.title}”` })
        isEditing.value = false
        await fetchProblem()
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
        errorToast("Couldn't delete the problem", { description: getErrorMessage(err, 'The request failed. Try again.') })
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
