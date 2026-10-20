<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Problems" description="Create, edit and retire problems. Inactive problems are hidden from students.">
            <template v-if="canCreate" #actions>
                <Button @click="goCreate">
                    <Plus class="size-4" />
                    New problem
                </Button>
            </template>
        </PageHeader>

        <!-- List card -->
        <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                <div class="relative w-full sm:w-[280px]">
                    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input v-model="search" type="search" placeholder="Search title" class="pl-8" aria-label="Search problems" />
                </div>
                <span v-if="pagination" class="ml-auto text-xs text-muted-foreground tabular-nums">
                    {{ pagination.totalElements.toLocaleString('en-US') }} {{ pagination.totalElements === 1 ? 'problem' : 'problems' }}
                </span>
            </div>

            <ListStateShell
                :loading="isLoading"
                :error="error ? 'The request failed. Check your connection and try again.' : null"
                :has-data="data !== null"
                :empty="problems.length === 0"
                :filtered="!!search"
                :filter-summary="search ? `“${search}”` : undefined"
                empty-title="No problems yet"
                empty-hint="Create the first one. It stays hidden from students until it's active."
                @retry="load"
                @clear-filters="search = ''"
            >
                <template #empty-action>
                    <Button v-if="canCreate" variant="secondary" size="sm" @click="goCreate">
                        <Plus class="size-4" />
                        New problem
                    </Button>
                </template>
                <div class="overflow-x-auto">
                    <table class="dt min-w-[820px]">
                        <thead>
                            <tr>
                                <th class="pl-4">Title</th>
                                <th>Difficulty</th>
                                <th>Tags</th>
                                <th>Status</th>
                                <th class="num">Submissions</th>
                                <th class="num">Updated</th>
                                <th><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="problem in problems"
                                :key="problem.id"
                                class="group cursor-pointer"
                                @click="goDetail(problem.problemSlug)"
                            >
                                <td class="max-w-[320px] pl-4">
                                    <RouterLink
                                        :to="{ name: 'AdminProblemDetail', params: { slug: problem.problemSlug } }"
                                        class="block truncate font-medium text-foreground hover:text-link hover:underline"
                                        @click.stop
                                    >{{ problem.title }}</RouterLink>
                                    <div class="slug truncate">{{ problem.problemSlug }}</div>
                                </td>
                                <td><DifficultyBadge :level="problem.hardnessLevel" /></td>
                                <td>
                                    <div v-if="problem.tags?.length" class="flex flex-wrap gap-1">
                                        <span
                                            v-for="tag in problem.tags"
                                            :key="tag"
                                            class="inline-flex h-[22px] items-center rounded-md border border-border bg-card px-2 font-mono text-[11.5px] whitespace-nowrap text-foreground"
                                        >{{ tag }}</span>
                                    </div>
                                    <span v-else class="text-muted-foreground">-</span>
                                </td>
                                <td>
                                    <Badge v-if="problem.status === 1" variant="success">Active</Badge>
                                    <Badge v-else variant="neutral">
                                        <EyeOff aria-hidden="true" />
                                        Inactive
                                    </Badge>
                                </td>
                                <td class="num">{{ problem.totalSubmission ? problem.totalSubmission.toLocaleString('en-US') : '-' }}</td>
                                <td class="num font-sans text-muted-foreground">{{ relativeTime(problem.updatedAt) }}</td>
                                <td class="act" @click.stop>
                                    <RowActionsMenu :items="rowActions(problem)" :label="problem.title" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </ListStateShell>
            <div class="px-4">
                <PaginationFooter :pagination="pagination ?? undefined" @change-page="onPageChange" @update:size="onSizeChange" />
            </div>
        </div>

        <ConfirmDialog
            :open="rejudgeOpen"
            :title="`Rejudge “${rejudgeTarget?.title ?? ''}”?`"
            description="Rejudges up to the 500 newest finished submissions of this problem, as many as the judge queue has room for."
            confirm-label="Rejudge"
            tone="neutral"
            :busy="rejudging"
            @update:open="(v) => (rejudgeOpen = v)"
            @confirm="confirmRejudge"
        />

        <ConfirmDialog
            :open="deleteOpen"
            :title="`Delete problem “${deleteTarget?.title ?? ''}”?`"
            description="Its test cases are deleted with it. You can undo for 8 seconds after deleting."
            confirm-label="Delete problem"
            @update:open="(v) => (deleteOpen = v)"
            @confirm="confirmDelete"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, RotateCcw, Download } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import type { RowAction } from '@/components/common/rowActions'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import { usePendingDeletes, isAlreadyGone } from '@/composables/usePendingDeletes'
import problemService from '@/services/problemService'
import submissionService from '@/services/submissionService'
import { useAuthStore } from '@/stores/auth'
import type { Problem } from '@/types/problem'
import { relativeTime } from '@/lib/problemDisplay'
import { announceQueued } from '@/lib/rejudgeQueued'
import { downloadUrl } from '@/lib/download'
import { ensureFreshSession } from '@/api/refreshSession'

const router = useRouter()
const authStore = useAuthStore()
const { undo, error: errorToast, triggerToast, loading, success: successToast, info: infoToast } = useToast()

const canCreate = computed(() => authStore.hasPermission('problem:create'))
const canUpdate = computed(() => authStore.hasPermission('problem:update'))
const canDelete = computed(() => authStore.hasPermission('problem:delete'))
const canRejudge = computed(() => authStore.hasPermission('submission:rejudge'))

const { data, isLoading, error, execute } = useFetch(problemService.getProblems, { immediate: false })

const page = ref(0)
const size = ref(10)
const search = ref('')

const pending = usePendingDeletes()
const problems = computed(() => pending.filter(data.value?.data ?? [], (p) => p.problemSlug))
const pagination = computed(() => data.value?.pagination ?? null)

const load = () => execute({ page: page.value, size: size.value, search: search.value || undefined })

const onPageChange = (p: number) => {
    page.value = p
    load()
}
const onSizeChange = (n: number) => {
    size.value = n
    page.value = 0
    load()
}

// Debounced search: reset to the first page and refetch.
watchDebounced(
    search,
    () => {
        page.value = 0
        load()
    },
    { debounce: 350 },
)

// --- Navigation to the create / detail pages ---
const goCreate = () => router.push({ name: 'AdminProblemCreate' })
const goDetail = (slug: string) => router.push({ name: 'AdminProblemDetail', params: { slug } })
const goEdit = (slug: string) => router.push({ name: 'AdminProblemDetail', params: { slug }, query: { edit: '1' } })

const rowActions = (p: Problem): RowAction[] => {
    const items: RowAction[] = [{ label: 'View', icon: Eye, onSelect: () => goDetail(p.problemSlug) }]
    if (canUpdate.value) items.push({ label: 'Edit', icon: Pencil, onSelect: () => goEdit(p.problemSlug) })
    if (canUpdate.value)
        items.push({ label: 'Export', icon: Download, disabled: exporting.value.has(p.problemSlug), onSelect: () => exportProblem(p) })
    if (canRejudge.value) items.push({ label: 'Rejudge…', icon: RotateCcw, onSelect: () => openRejudge(p) })
    if (canDelete.value) items.push({ label: 'Delete…', icon: Trash2, destructive: true, onSelect: () => openDelete(p) })
    return items
}

// --- Export: the package zip, built by the server and opened as a link, so it streams to disk ---
// Slugs whose export is starting; their menu item is disabled until the browser has the link.
const exporting = ref(new Set<string>())

const exportProblem = async (p: Problem) => {
    const slug = p.problemSlug
    if (exporting.value.has(slug)) return
    exporting.value.add(slug)
    const toast = loading(`Preparing ${slug}.zip`)
    try {
        // The link carries the access cookie but not the client's refresh-on-401.
        await ensureFreshSession()
        // A refused refresh has logged out, with its own toast.
        if (!authStore.user) {
            toast.dismiss()
            return
        }
        downloadUrl(problemService.exportUrl(slug), `${slug}.zip`)
        toast.update({ type: 'success', title: 'Download started', description: `${slug}.zip` })
    } finally {
        exporting.value.delete(slug)
    }
}

// --- Rejudge confirm ---
const rejudgeOpen = ref(false)
const rejudgeTarget = ref<Problem | null>(null)
const rejudging = ref(false)

const openRejudge = (p: Problem) => {
    rejudgeTarget.value = p
    rejudgeOpen.value = true
}

const confirmRejudge = async () => {
    if (!rejudgeTarget.value || rejudging.value) return
    rejudging.value = true
    try {
        const res = await submissionService.rejudgeProblem(rejudgeTarget.value.problemSlug)
        announceQueued(res.data.data.queued, { success: successToast, info: infoToast })
        rejudgeOpen.value = false
    } catch (err) {
        triggerToast(getErrorMessage(err, "Couldn't rejudge the problem"), 'error')
    } finally {
        rejudging.value = false
    }
}

// --- Delete confirm ---
const deleteOpen = ref(false)
const deleteTarget = ref<Problem | null>(null)
const openDelete = (p: Problem) => {
    deleteTarget.value = p
    deleteOpen.value = true
}

// The row is hidden at once (also across reloads); the request waits out the undo window.
const startDelete = (p: Problem) => {
    if (!pending.add(p.problemSlug)) return
    undo('Problem deleted', {
        description: `“${p.title}”`,
        onUndo: () => pending.remove(p.problemSlug),
        commitOnUnload: () => problemService.deleteKeepalive(p.problemSlug),
        // Catches its own errors, so the toast engine never sees a rejection.
        commit: async () => {
            try {
                try {
                    await problemService.remove(p.problemSlug)
                } catch (err) {
                    if (!isAlreadyGone(err)) throw err
                }
                pending.remove(p.problemSlug)
                // If we just removed the last row on a non-first page, step back.
                if (problems.value.length === 0 && page.value > 0) page.value -= 1
                load()
            } catch {
                pending.remove(p.problemSlug)
                errorToast("Couldn't delete the problem", {
                    action: { label: 'Retry', onClick: () => startDelete(p) },
                })
            }
        },
    })
}

const confirmDelete = () => {
    const target = deleteTarget.value
    if (!target) return
    deleteOpen.value = false
    startDelete(target)
}

onMounted(load)
</script>
