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
            <ListStateShell
                :loading="isLoading || preparing"
                :error="error ? 'The request failed. Check your connection and try again.' : null"
                :has-data="data !== null"
                :empty="contests.length === 0"
                :rows="4"
                empty-title="No contests yet"
                empty-hint="Create the first one. It stays a draft until you publish it."
                @retry="load"
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
            <p v-for="note in capNotes" :key="note" class="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{{ note }}</p>
        </div>

        <ContestFormDialog :open="formOpen" :slug="formSlug" @update:open="(v) => (formOpen = v)" @saved="onSaved" />

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
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { RowAction } from '@/components/common/rowActions'
import ContestFormDialog from '@/components/admin/contest/ContestFormDialog.vue'
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

const PHASES: Record<ContestPhase, { label: string; class: string }> = {
    RUNNING: { label: 'Running', class: 'font-medium text-success-ink' },
    UPCOMING: { label: 'Upcoming', class: 'text-foreground' },
    ENDED: { label: 'Ended', class: 'text-muted-foreground' },
}

// The public list, which also carries drafts for contest editors. It has no pages: at most 50 running and upcoming
// contests (the soonest) and the 50 most recently ended, so a full section says what it leaves out.
const LIST_CAP = 50
const { data, isLoading, error, execute } = useFetch(contestService.list, { immediate: false, transform: (res) => res.data })
const contests = computed<ContestSummary[]>(() => {
    const l = data.value
    return l ? [...l.running, ...l.upcoming, ...l.past] : []
})
const capNotes = computed(() => {
    const l = data.value
    if (!l) return []
    const notes: string[] = []
    if (l.running.length + l.upcoming.length >= LIST_CAP) {
        notes.push(`Showing the ${LIST_CAP} soonest running and upcoming contests. Later ones are not listed.`)
    }
    if (l.past.length >= LIST_CAP) notes.push(`Showing the ${LIST_CAP} most recently ended contests. Older ones are not listed.`)
    return notes
})

// Drafts are listed only for a valid token (a lapsed one reads as anonymous), so the session is made fresh first.
const preparing = ref(false)
const load = async () => {
    preparing.value = true
    try {
        await ensureFreshSession()
    } finally {
        preparing.value = false
    }
    await execute()
}
onMounted(load)

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

const rowActions = (c: ContestSummary): RowAction[] => {
    const items: RowAction[] = []
    if (canUpdate.value) items.push({ label: 'Edit', icon: Pencil, onSelect: () => openEdit(c) })
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
