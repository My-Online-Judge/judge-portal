<template>
    <div class="flex flex-col gap-[22px]">
        <!-- Page header -->
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Problems</h1>
                <p class="mt-1 text-sm text-muted-foreground">Create, edit and remove problems.</p>
            </div>
            <Button v-if="canCreate" class="h-[38px]" @click="goCreate">
                <Plus class="size-4" />
                Create problem
            </Button>
        </div>

        <!-- List card -->
        <div class="min-w-0 rounded-xl border border-border bg-card">
            <!-- Card header + search -->
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-[18px]">
                <h2 class="text-base font-medium text-foreground">All problems</h2>
                <div class="relative w-full sm:w-[260px]">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input v-model="search" placeholder="Search problems…" class="h-9 pl-8" aria-label="Search problems" />
                </div>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="space-y-2.5 p-[18px]">
                <div v-for="n in 6" :key="n" class="h-11 w-full rounded bg-muted animate-ojpulse" />
            </div>

            <!-- Error -->
            <div v-else-if="error" class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-12 text-center">
                    <TriangleAlert class="size-6 text-err" />
                    <p class="text-sm font-medium text-foreground">Couldn't load problems.</p>
                    <p class="max-w-xs text-xs text-muted-foreground">
                        The request failed. Check your connection and try again.
                    </p>
                    <Button variant="outline" size="sm" @click="load">
                        <RefreshCw class="size-4" />
                        Retry
                    </Button>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="problems.length === 0" class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
                    <ListChecks class="size-6 text-muted-foreground" />
                    <p class="text-sm font-medium text-foreground">
                        {{ search ? 'No problems match your search.' : 'No problems yet — create one.' }}
                    </p>
                    <Button v-if="canCreate && !search" variant="outline" size="sm" @click="goCreate">
                        <Plus class="size-4" />
                        Create problem
                    </Button>
                </div>
            </div>

            <!-- Data -->
            <template v-else>
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
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                            aria-label="Problem actions"
                                        >
                                            <MoreHorizontal class="size-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" class="w-36">
                                            <DropdownMenuItem @select="goDetail(problem.problemSlug)">
                                                <Eye class="size-4" />
                                                View
                                            </DropdownMenuItem>
                                            <DropdownMenuItem v-if="canUpdate" @select="goEdit(problem.problemSlug)">
                                                <Pencil class="size-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                v-if="canDelete"
                                                variant="destructive"
                                                @select="openDelete(problem)"
                                            >
                                                <Trash2 class="size-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between gap-3 border-t border-border p-[18px]">
                    <p class="text-[12px] text-muted-foreground">
                        Showing <span class="font-mono text-foreground">{{ problems.length }}</span> of
                        <span class="font-mono text-foreground">{{ totalElements }}</span>
                    </p>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" size="sm" :disabled="!canPrev" @click="goPrev">Previous</Button>
                        <Button variant="outline" size="sm" :disabled="!canNext" @click="goNext">Next</Button>
                    </div>
                </div>
            </template>
        </div>

        <!-- Delete confirm -->
        <Dialog v-model:open="deleteOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete problem?</DialogTitle>
                    <DialogDescription>
                        This permanently removes the problem and its test cases. This can't be undone.
                    </DialogDescription>
                </DialogHeader>
                <div v-if="deleteTarget" class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="truncate text-sm font-medium text-foreground">{{ deleteTarget.title }}</p>
                    <p class="truncate font-mono text-xs text-muted-foreground">{{ deleteTarget.problemSlug }}</p>
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import {
    Plus,
    Search,
    ListChecks,
    TriangleAlert,
    RefreshCw,
    MoreHorizontal,
    Eye,
    Pencil,
    Trash2,
    Loader2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
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
const totalElements = computed(() => pagination.value?.totalElements ?? problems.value.length)
const canPrev = computed(() => (pagination.value ? pagination.value.hasPrev : page.value > 0))
const canNext = computed(() => pagination.value?.hasNext ?? false)

const load = () => execute({ page: page.value, size: size.value, search: search.value || undefined })

const goPrev = () => {
    if (!canPrev.value) return
    page.value = Math.max(0, page.value - 1)
    load()
}

const goNext = () => {
    if (!canNext.value) return
    page.value += 1
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

// --- Delete confirm ---
const deleteOpen = ref(false)
const deleteTarget = ref<Problem | null>(null)
const deleting = ref(false)

const openDelete = (p: Problem) => {
    deleteTarget.value = p
    deleteOpen.value = true
}

const confirmDelete = async () => {
    if (!deleteTarget.value) return
    deleting.value = true
    try {
        await problemService.remove(deleteTarget.value.problemSlug)
        triggerToast('Problem deleted', 'success')
        // If we just removed the last row on a non-first page, step back.
        if (problems.value.length === 1 && page.value > 0) page.value -= 1
        deleteOpen.value = false
        deleteTarget.value = null
        load()
    } catch (err: any) {
        triggerToast(err?.response?.data?.message || 'Could not delete the problem.', 'error')
    } finally {
        deleting.value = false
    }
}

onMounted(load)
</script>
