<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Participants in {{ title }}</DialogTitle>
                <DialogDescription>{{ countLine }}</DialogDescription>
            </DialogHeader>

            <!-- The admin page's list chrome, in a dialog: a search, the count, the rows, the footer. -->
            <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                    <div class="relative w-full sm:w-[280px]">
                        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input v-model="search" type="search" placeholder="Search username or name" class="pl-8" aria-label="Search participants" />
                    </div>
                    <Button type="button" variant="ghost" size="sm" class="ml-auto" :disabled="exporting || !slug" @click="exportCsv">
                        <Loader2 v-if="exporting" class="size-4 animate-spin" aria-hidden="true" />
                        <Download v-else class="size-4" aria-hidden="true" />
                        {{ exporting ? 'Exporting…' : 'Export CSV' }}
                    </Button>
                </div>

                <ListStateShell
                    :loading="isLoading || preparing"
                    :error="error ? 'The request failed. Check your connection and try again.' : null"
                    :has-data="data !== null"
                    :empty="rows.length === 0"
                    :filtered="!!query"
                    :filter-summary="query ? `“${query}”` : undefined"
                    :rows="4"
                    empty-title="No one has registered yet"
                    empty-hint="Students register from the contest page until it ends."
                    @retry="load"
                    @clear-filters="search = ''"
                >
                    <div class="max-h-[50vh] overflow-auto">
                        <table class="dt min-w-[560px]">
                            <thead>
                                <tr>
                                    <th class="pl-4">Username</th>
                                    <th>Name</th>
                                    <th>Registered</th>
                                    <th><span class="sr-only">Remove</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rows" :key="r.user.id">
                                    <!-- Identity may no longer know the user: the id stands in, so the row can still be removed. -->
                                    <td class="pl-4 font-medium" :class="r.user.username ? 'text-foreground' : 'font-mono text-muted-foreground'">
                                        {{ handleOf(r) }}
                                    </td>
                                    <td class="max-w-[260px] truncate" :class="r.user.name ? '' : 'text-muted-foreground'">{{ r.user.name ?? '-' }}</td>
                                    <td class="whitespace-nowrap text-muted-foreground">{{ formatContestDate(r.enrolledAt) }}</td>
                                    <td class="act">
                                        <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Remove ${handleOf(r)}`" @click="askToRemove(r)">
                                            <UserMinus class="size-4" aria-hidden="true" />
                                        </Button>
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

            <DialogFooter>
                <Button type="button" variant="secondary" @click="onOpenChange(false)">Close</Button>
            </DialogFooter>
        </DialogContent>

        <ConfirmDialog
            :open="removeOpen"
            :title="`Remove ${removeTarget ? handleOf(removeTarget) : ''} from the contest?`"
            description="Their registration is deleted; they can register again while registration is open."
            confirm-label="Remove"
            tone="destructive"
            :busy="removing"
            @update:open="(v) => (removeOpen = v)"
            @confirm="confirmRemove"
        />
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { Download, Loader2, Search, UserMinus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { ensureFreshSession } from '@/api/refreshSession'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { downloadCsv, toCsv } from '@/lib/csv'
import { getErrorMessage } from '@/lib/errorMessage'
import { formatContestDate } from '@/lib/contestTime'
import contestService from '@/services/contestService'
import type { EnrollmentRow } from '@/types/contest'

// Who is registered for a required contest (contest enrollment design §5.4): a paged, searchable list the admin can
// trim one row at a time or take away whole as a CSV. `slug` is null while the dialog is closed.
const props = defineProps<{ open: boolean; slug: string | null; title: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; changed: [] }>()

const { success: successToast, error: errorToast } = useToast()

const { data, isLoading, error, execute } = useFetch(contestService.participants, { immediate: false })
const page = ref(0)
const size = ref(20)
const search = ref('')
// The search the shown list answers: it moves with a request, not with each key.
const query = ref('')
const rows = computed<EnrollmentRow[]>(() => data.value?.data ?? [])
const pagination = computed(() => data.value?.pagination ?? null)

const handleOf = (r: EnrollmentRow) => r.user.username ?? r.user.id
const countLine = computed(() => {
    const n = pagination.value?.totalElements
    if (n === undefined) return 'Who has registered, newest first.'
    if (query.value) return `${n} ${n === 1 ? 'match' : 'matches'} “${query.value}”`
    return `${n} registered`
})

// The endpoint needs contest:update on a valid token (a lapsed one reads as anonymous), so the session is made fresh.
const preparing = ref(false)
const load = async () => {
    if (!props.slug) return
    preparing.value = true
    try {
        await ensureFreshSession()
    } finally {
        preparing.value = false
    }
    query.value = search.value.trim()
    await execute(props.slug, { page: page.value, size: size.value, ...(query.value ? { q: query.value } : {}) })
}

// Opening starts from the first page with an empty search, whichever contest it is for.
watch(
    () => [props.open, props.slug] as const,
    ([open]) => {
        if (!open) return
        page.value = 0
        search.value = ''
        query.value = ''
        void load()
    },
    { immediate: true },
)

const onPageChange = (p: number) => {
    page.value = p
    void load()
}
const onSizeChange = (n: number) => {
    size.value = n
    page.value = 0
    void load()
}
// A new search starts on the first page, after the typing pauses. Closing clears the box, which must not reload.
watchDebounced(
    search,
    () => {
        if (!props.open) return
        page.value = 0
        void load()
    },
    { debounce: 300 },
)

function onOpenChange(value: boolean) {
    emit('update:open', value)
}

// --- Remove: no undo for the student (they may register again), so it asks first ---
const removeOpen = ref(false)
const removeTarget = ref<EnrollmentRow | null>(null)
const removing = ref(false)
const askToRemove = (r: EnrollmentRow) => {
    removeTarget.value = r
    removeOpen.value = true
}
const confirmRemove = async () => {
    const target = removeTarget.value
    if (!target || removing.value || !props.slug) return
    removing.value = true
    try {
        await contestService.removeParticipant(props.slug, target.user.id)
        removeOpen.value = false
        successToast('Participant removed', { description: handleOf(target) })
        // The last row of a page that is not the first leaves it empty: step back one page.
        if (rows.value.length === 1 && page.value > 0) page.value -= 1
        emit('changed')
        void load()
    } catch (err) {
        removeOpen.value = false
        errorToast(getErrorMessage(err, "Couldn't remove the participant. Try again."))
    } finally {
        removing.value = false
    }
}

// --- Export: the whole roster, a hundred rows a page, whatever the search box and the shown page say ---
const EXPORT_PAGE = 100
const exporting = ref(false)
const exportCsv = async () => {
    const slug = props.slug
    if (!slug || exporting.value) return
    exporting.value = true
    try {
        const lines: string[][] = [['username', 'name', 'user_id', 'enrolled_at']]
        for (let p = 0; ; p++) {
            const res = await contestService.participants(new AbortController().signal, slug, { page: p, size: EXPORT_PAGE })
            const batch = res.data.data
            for (const r of batch) lines.push([r.user.username ?? '', r.user.name ?? '', r.user.id, r.enrolledAt])
            if (!res.data.pagination?.hasNext || batch.length === 0) break
        }
        downloadCsv(`participants-${slug}.csv`, toCsv(lines))
    } catch (err) {
        errorToast(getErrorMessage(err, "Couldn't export the participants. Try again."))
    } finally {
        exporting.value = false
    }
}
</script>
