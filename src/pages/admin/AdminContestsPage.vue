<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Contests" description="Schedule contests and choose their problems. Drafts are hidden from students.">
            <template v-if="canCreate" #actions>
                <Button @click="openCreate">
                    <Plus class="size-4" />
                    New contest
                </Button>
            </template>
        </PageHeader>

        <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                <div class="relative w-full sm:w-[280px]">
                    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input v-model="search" type="search" placeholder="Search slug or title" class="pl-8" aria-label="Search contests" />
                </div>
                <span v-if="pagination" class="ml-auto text-xs text-muted-foreground tabular-nums">
                    {{ pagination.totalElements.toLocaleString('en-US') }} {{ pagination.totalElements === 1 ? 'contest' : 'contests' }}
                </span>
            </div>

            <ListStateShell
                :loading="isLoading || preparing"
                :error="error ? 'The request failed. Check your connection and try again.' : null"
                :has-data="data !== null"
                :empty="contests.length === 0"
                :filtered="!!query"
                :filter-summary="query ? `“${query}”` : undefined"
                :rows="4"
                empty-title="No contests yet"
                empty-hint="Create the first one. It stays a draft until you publish it."
                @retry="load"
                @clear-filters="search = ''"
            >
                <template #empty-action>
                    <Button v-if="canCreate" variant="secondary" size="sm" @click="openCreate">
                        <Plus class="size-4" />
                        New contest
                    </Button>
                </template>
                <div class="overflow-x-auto">
                    <table class="dt min-w-[860px]">
                        <thead>
                            <tr>
                                <th class="pl-4">Title</th>
                                <th>Status</th>
                                <th>Phase</th>
                                <th>Registration</th>
                                <th>Starts</th>
                                <th>Ends</th>
                                <th class="num">Problems</th>
                                <th><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="c in contests" :key="c.slug">
                                <td class="max-w-[320px] pl-4">
                                    <RouterLink
                                        :to="`${ROUTE_PATH.CONTESTS}/${c.slug}`"
                                        class="block truncate font-medium text-foreground hover:text-link hover:underline"
                                    >{{ c.title }}</RouterLink>
                                    <div class="slug truncate">{{ c.slug }}</div>
                                </td>
                                <td>
                                    <Badge v-if="c.status === 'DRAFT'" variant="neutral">Draft</Badge>
                                    <Badge v-else variant="success">Published</Badge>
                                </td>
                                <td :class="c.status === 'DRAFT' ? 'text-muted-foreground' : PHASES[c.phase].class">{{ PHASES[c.phase].label }}</td>
                                <!-- The kind, and for a required contest how many are in, under it (text, no chip). -->
                                <td class="whitespace-nowrap">
                                    <template v-if="c.enrollment === 'REQUIRED'">
                                        <span class="block">Required</span>
                                        <span class="block text-xs tabular-nums text-muted-foreground">{{ registered(c.enrolledCount) }}</span>
                                    </template>
                                    <span v-else class="text-muted-foreground">Open</span>
                                </td>
                                <td class="whitespace-nowrap text-muted-foreground">{{ formatContestDate(c.startsAt) }}</td>
                                <td class="whitespace-nowrap text-muted-foreground">{{ formatContestDate(c.endsAt) }}</td>
                                <td class="num">{{ c.problemCount }}</td>
                                <td class="act">
                                    <RowActionsMenu v-if="rowActions(c).length" :items="rowActions(c)" :label="c.title" />
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

        <ContestFormDialog :open="formOpen" :slug="formSlug" @update:open="(v) => (formOpen = v)" @saved="onSaved" />

        <ParticipantsDialog
            :open="participantsOpen"
            :slug="participantsTarget?.slug ?? null"
            :title="participantsTarget?.title ?? ''"
            @update:open="(v) => (participantsOpen = v)"
            @changed="load"
        />

        <ConfirmDialog
            :open="deleteOpen"
            :title="`Delete contest “${deleteTarget?.title ?? ''}”?`"
            description="Its problem list and scores are deleted with it. This can't be undone."
            confirm-label="Delete contest"
            tone="destructive"
            :busy="deleting"
            @update:open="(v) => (deleteOpen = v)"
            @confirm="confirmDelete"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { isAxiosError } from 'axios'
import { watchDebounced } from '@vueuse/core'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { RowAction } from '@/components/common/rowActions'
import ContestFormDialog from '@/components/admin/contest/ContestFormDialog.vue'
import ParticipantsDialog from '@/components/admin/contest/ParticipantsDialog.vue'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { ensureFreshSession } from '@/api/refreshSession'
import { getErrorMessage } from '@/lib/errorMessage'
import { formatContestDate } from '@/lib/contestTime'
import contestService from '@/services/contestService'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestPhase, ContestSummary } from '@/types/contest'

const authStore = useAuthStore()
const { success: successToast, error: errorToast } = useToast()

const canCreate = computed(() => authStore.hasPermission('contest:create'))
const canUpdate = computed(() => authStore.hasPermission('contest:update'))
const canDelete = computed(() => authStore.hasPermission('contest:delete'))

const registered = (n: number) => (n === 1 ? '1 registered' : `${n} registered`)

const PHASES: Record<ContestPhase, { label: string; class: string }> = {
    RUNNING: { label: 'Running', class: 'font-medium text-success-ink' },
    UPCOMING: { label: 'Upcoming', class: 'text-foreground' },
    ENDED: { label: 'Ended', class: 'text-muted-foreground' },
}

// Every contest, drafts included, a page at a time: newest start first, as the server sorts. The search is the
// server's too (slug or title), so a long list is never cut off.
const { data, isLoading, error, execute } = useFetch(contestService.listAll, { immediate: false })
const page = ref(0)
const size = ref(20)
const search = ref('')
// The search the shown list answers: it moves with a request, not with each key.
const query = ref('')
const contests = computed<ContestSummary[]>(() => data.value?.data ?? [])
const pagination = computed(() => data.value?.pagination ?? null)

// The endpoint needs a valid token (a lapsed one reads as anonymous), so the session is made fresh first.
const preparing = ref(false)
const load = async () => {
    preparing.value = true
    try {
        await ensureFreshSession()
    } finally {
        preparing.value = false
    }
    query.value = search.value.trim()
    await execute({ page: page.value, size: size.value, ...(query.value ? { q: query.value } : {}) })
}
onMounted(load)

const onPageChange = (p: number) => {
    page.value = p
    void load()
}
const onSizeChange = (n: number) => {
    size.value = n
    page.value = 0
    void load()
}
// A new search starts on the first page, after the typing pauses.
watchDebounced(
    search,
    () => {
        page.value = 0
        void load()
    },
    { debounce: 300 },
)

// --- Create and edit ---
const formOpen = ref(false)
const formSlug = ref<string | null>(null)
const openCreate = () => {
    formSlug.value = null
    formOpen.value = true
}
const openEdit = (c: ContestSummary) => {
    formSlug.value = c.slug
    formOpen.value = true
}
const onSaved = () => {
    successToast(formSlug.value ? 'Contest saved' : 'Contest created')
    void load()
}

// --- Participants of a required contest: the same permission as the edit (contest:update) ---
const participantsOpen = ref(false)
const participantsTarget = ref<ContestSummary | null>(null)
const openParticipants = (c: ContestSummary) => {
    participantsTarget.value = c
    participantsOpen.value = true
}

const rowActions = (c: ContestSummary): RowAction[] => {
    const items: RowAction[] = []
    if (canUpdate.value) items.push({ label: 'Edit', icon: Pencil, onSelect: () => openEdit(c) })
    if (canUpdate.value && c.enrollment === 'REQUIRED') {
        items.push({ label: 'Participants', icon: Users, onSelect: () => openParticipants(c) })
    }
    if (canDelete.value) {
        // The server refuses to delete a published contest that has started, so the item says what to do instead.
        const started = c.status === 'PUBLISHED' && c.phase !== 'UPCOMING'
        items.push({
            label: 'Delete…',
            icon: Trash2,
            destructive: true,
            onSelect: () => openDelete(c),
            ...(started ? { disabled: true, hint: 'Set it to Draft first, then delete' } : {}),
        })
    }
    return items
}

// --- Delete: no undo, so it asks first ---
const deleteOpen = ref(false)
const deleteTarget = ref<ContestSummary | null>(null)
const deleting = ref(false)
const openDelete = (c: ContestSummary) => {
    deleteTarget.value = c
    deleteOpen.value = true
}

const confirmDelete = async () => {
    const target = deleteTarget.value
    if (!target || deleting.value) return
    deleting.value = true
    try {
        await contestService.remove(target.slug)
        deleteOpen.value = false
        successToast('Contest deleted', { description: `“${target.title}”` })
        // The last row of a page that is not the first leaves it empty: step back one page.
        if (contests.value.length === 1 && page.value > 0) page.value -= 1
        void load()
    } catch (err) {
        deleteOpen.value = false
        // A row that was stale: the contest has started since the list was read (409), and the way out is Draft.
        const conflict = isAxiosError(err) && err.response?.status === 409
        errorToast(
            getErrorMessage(err, "Couldn't delete the contest. Try again."),
            conflict ? { description: 'Set it to Draft first to delete it.' } : {},
        )
    } finally {
        deleting.value = false
    }
}
</script>
