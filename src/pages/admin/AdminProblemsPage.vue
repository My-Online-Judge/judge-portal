<template>
    <div class="flex flex-col gap-[22px]">
        <AdminPageHeader title="Problems" description="Create, edit and remove problems.">
            <template v-if="canCreate" #actions>
                <Button @click="goCreate">
                    <Plus class="size-4" />
                    New problem
                </Button>
            </template>
        </AdminPageHeader>

        <!-- List card -->
        <div class="min-w-0 rounded-xl border border-border bg-card">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-[18px]">
                <h2 class="text-base font-medium text-foreground">All problems</h2>
                <div class="relative w-full sm:w-[260px]">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input v-model="search" placeholder="Search problems…" class="h-9 pl-8" aria-label="Search problems" />
                </div>
            </div>

            <ListStateShell :loading="isLoading" :error="error ? 'error' : null" :has-data="data !== null" :empty="problems.length === 0" @retry="load">
                <template #empty>
                    <div class="p-[18px]">
                        <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
                            <ListChecks class="size-6 text-muted-foreground" />
                            <p class="text-sm font-medium text-foreground">
                                {{ search ? 'No problems match your search.' : 'No problems yet — create one.' }}
                            </p>
                            <Button v-if="canCreate && !search" variant="outline" size="sm" @click="goCreate">
                                <Plus class="size-4" />
                                New problem
                            </Button>
                        </div>
                    </div>
                </template>
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[760px] border-collapse text-sm">
                            <thead>
                                <tr class="border-b border-border text-left">
                                    <th class="px-[18px] py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">ID</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Title</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Difficulty</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Updated</th>
                                    <th class="px-[18px] py-2.5 text-right"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="problem in problems"
                                    :key="problem.id"
                                    class="group cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-muted/40"
                                    @click="goDetail(problem.problemSlug)"
                                >
                                    <td class="whitespace-nowrap px-[18px] py-3 font-mono text-[12px] text-muted-foreground">
                                        {{ shortId(problem.id) }}
                                    </td>
                                    <td class="px-3 py-3">
                                        <div class="flex min-w-0 flex-col">
                                            <span class="truncate font-medium text-foreground group-hover:underline">{{ problem.title }}</span>
                                            <span class="truncate font-mono text-[11px] text-muted-foreground">{{ problem.problemSlug }}</span>
                                        </div>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-muted-foreground">
                                        {{ difficultyLabel(problem.hardnessLevel) }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-3">
                                        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[12px] text-foreground">
                                            <span class="size-1.5 rounded-full" :class="statusDotClass(problem.status)" />
                                            {{ statusLabel(problem.status) }}
                                        </span>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-muted-foreground">
                                        {{ relativeTime(problem.updatedAt) }}
                                    </td>
                                    <td class="whitespace-nowrap px-[18px] py-3 text-right" @click.stop>
                                        <RowActionsMenu :items="rowActions(problem)" :label="problem.title" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
            </ListStateShell>
            <PaginationFooter :pagination="pagination ?? undefined" @change-page="onPageChange" @update:size="onSizeChange" />
        </div>

        <ConfirmDialog
            :open="deleteOpen"
            :title="`Delete problem “${deleteTarget?.title ?? ''}”?`"
            description="It disappears from the problem list. Submissions are kept."
            confirm-label="Delete"
            :busy="deleting"
            @update:open="(v) => (deleteOpen = v)"
            @confirm="confirmDelete"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { Plus, Search, ListChecks, Eye, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { RowAction } from '@/components/common/rowActions'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import problemService from '@/services/problemService'
import { useAuthStore } from '@/stores/auth'
import type { Problem } from '@/types/problem'
import { shortId, difficultyLabel, statusLabel, statusDotClass, relativeTime } from '@/lib/problemDisplay'

const router = useRouter()
const authStore = useAuthStore()
const { triggerToast } = useToast()

const canCreate = computed(() => authStore.hasPermission('problem:create'))
const canUpdate = computed(() => authStore.hasPermission('problem:update'))
const canDelete = computed(() => authStore.hasPermission('problem:delete'))

const { data, isLoading, error, execute } = useFetch(problemService.getProblems, { immediate: false })

const page = ref(0)
const size = ref(10)
const search = ref('')

const problems = computed(() => data.value?.data ?? [])
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
    if (canDelete.value) items.push({ label: 'Delete…', icon: Trash2, destructive: true, onSelect: () => openDelete(p) })
    return items
}

// --- Delete confirm ---
const deleteOpen = ref(false)
const deleteTarget = ref<Problem | null>(null)
const deleting = ref(false)

const openDelete = (p: Problem) => {
    deleteTarget.value = p
    deleteOpen.value = true
}

const confirmDelete = async () => {
    if (!deleteTarget.value || deleting.value) return
    deleting.value = true
    try {
        await problemService.remove(deleteTarget.value.problemSlug)
        triggerToast('Problem deleted', 'success')
        // If we just removed the last row on a non-first page, step back.
        if (problems.value.length === 1 && page.value > 0) page.value -= 1
        deleteOpen.value = false
        deleteTarget.value = null
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not delete the problem.'), 'error')
    } finally {
        deleting.value = false
    }
}

onMounted(load)
</script>
