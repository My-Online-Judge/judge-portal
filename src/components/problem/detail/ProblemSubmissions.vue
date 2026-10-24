<template>
    <div>
        <div v-if="!authStore.isAuthenticated" class="flex flex-col items-start gap-1 px-4 py-4 text-sm">
            <p class="font-medium text-foreground">Log in to see your submissions</p>
            <p class="text-muted-foreground">Each attempt at this problem is listed here with its verdict.</p>
            <Button size="sm" variant="secondary" class="mt-2" @click="isLoginOpen = true">Log in</Button>
        </div>

        <div v-else>
            <ListStateShell
                :loading="isLoading"
                :error="error ? 'Check your connection and try again.' : null"
                :has-data="!!response || displayRows.length > 0"
                :empty="displayRows.length === 0"
                empty-title="No submissions yet"
                empty-hint="Each attempt at this problem is listed here with its verdict."
                @retry="fetchSubmissions"
            >
                <div class="overflow-x-auto">
                    <Table class="min-w-[560px]">
                        <TableHeader>
                            <TableRow class="border-border hover:bg-transparent">
                                <TableHead v-for="head in heads" :key="head"
                                    class="h-9 text-xs font-medium text-muted-foreground first:pl-4 last:pr-4">{{ head }}</TableHead>
                                <TableHead class="h-9 pr-4"><span class="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow
                                v-for="sub in displayRows"
                                :key="sub.id"
                                tabindex="0"
                                :aria-label="`Open submission ${sub.id.substring(0, 8)}`"
                                :class="[
                                    'cursor-pointer border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                                    sub.id === highlightId ? 'bg-primary-soft/50' : '',
                                ]"
                                @click="openDetail(sub.id)"
                                @keydown.enter.self="openDetail(sub.id)"
                                @keydown.space.self.prevent="openDetail(sub.id)"
                            >
                                <TableCell class="py-2 pl-4">
                                    <span :class="['inline-flex items-center gap-2', `v-${verdictMeta(sub.status).tone}`]">
                                        <VerdictChip size="sm" :status="sub.status" />
                                        <span class="text-[13px] font-medium whitespace-nowrap text-[var(--vi)]">{{ verdictMeta(sub.status).name }}</span>
                                    </span>
                                </TableCell>
                                <TableCell class="tabular py-2 text-[12.5px]">{{ testsOf(sub) }}</TableCell>
                                <TableCell class="tabular py-2 text-[12.5px]">
                                    {{ sub.cpuTime != null ? `${sub.cpuTime} ms` : '-' }}
                                </TableCell>
                                <TableCell class="tabular py-2 text-[12.5px]">
                                    {{ sub.memory ? `${(sub.memory / (1024 * 1024)).toFixed(1)} MB` : '-' }}
                                </TableCell>
                                <TableCell class="py-2 text-[13px]">{{ sub.language?.name ?? '-' }}</TableCell>
                                <TableCell class="py-2 text-[13px] whitespace-nowrap text-muted-foreground" :title="formatDateTime(sub.createdAt)">
                                    {{ formatRelativeTime(sub.createdAt) }}
                                </TableCell>
                                <TableCell class="py-1.5 pr-4 text-right">
                                    <Button variant="outline" size="sm" class="h-8 px-2.5 text-[12.5px]" :disabled="loadingId === sub.id"
                                        :data-test="`load-${sub.id}`" @click.stop="loadCode(sub)">
                                        <Loader2 v-if="loadingId === sub.id" class="animate-spin motion-reduce:animate-none" />
                                        Load code
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </ListStateShell>

            <div class="px-4">
                <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
            </div>
        </div>
        <LoginModal v-model:open="isLoginOpen" />
        <SubmissionDetailDialog v-model:open="isDetailOpen" :submission-id="detailId" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import LoginModal from '@/components/auth/LoginModal.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import SubmissionDetailDialog from './SubmissionDetailDialog.vue'
import { useAuthStore } from '@/stores/auth'
import submissionService from '@/services/submissionService'
import { useFetch } from '@/composables/useFetch'

import { formatDateTime, formatRelativeTime } from '@/utils/dateTimeUtils'
import { Loader2 } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useSubmissionStream } from '@/composables/useSubmissionStream'
import type { Submission } from '@/types/submission'
import { isTerminalStatus } from '@/types/submission'
import VerdictChip from '@/components/common/VerdictChip.vue'
import { verdictMeta } from '@/lib/verdict'

const props = defineProps<{
    problemSlug: string
    pendingSubmission?: Submission | null
    // The submission shown in the Result tab, tinted in the list.
    highlightId?: string | null
}>()
const emit = defineEmits<{
    (e: 'consumed'): void
    // How many submissions this problem has from the reader, once known.
    (e: 'count', total: number): void
    // Put this submission's code back in the editor.
    (e: 'load', submission: Submission): void
    // The newest row, with its live verdict.
    (e: 'newest', submission: Submission | null): void
}>()

const authStore = useAuthStore()
const isLoginOpen = ref(false)
const isDetailOpen = ref(false)
const detailId = ref<string | null>(null)

const openDetail = (id: string) => {
    detailId.value = id
    isDetailOpen.value = true
}
const page = ref(0)
const size = ref(10)
const heads = ['Verdict', 'Tests', 'Time', 'Memory', 'Language', 'Submitted']

const {
    data: response,
    isLoading,
    error,
    execute,
} = useFetch(submissionService.getSubmissionsByUserAndProblem, {
    immediate: false,
})

const pagination = computed(() => response.value?.pagination)
const { watch: watchVerdict, stop: stopVerdict, stopAll: stopAllVerdicts } = useSubmissionStream()
const liveRows = ref<Submission[]>([])
// Streamed verdicts by submission id, merged over the row they belong to. A row fetched with a final status is
// already newer than any verdict streamed before, so only rows still judging take the override.
const overrides = ref<Record<string, Submission>>({})
const applyVerdict = (verdict: Submission) => {
    overrides.value = { ...overrides.value, [verdict.id]: verdict }
}
const withVerdict = (row: Submission): Submission => {
    const verdict = overrides.value[row.id]
    return verdict && !isTerminalStatus(row.status) ? { ...row, ...verdict } : row
}

// Optimistic rows shown above the fetched page; dedupe so a row that later
// appears in the fetched page is not rendered twice.
const displayRows = computed(() => {
    const liveIds = new Set(liveRows.value.map((r) => r.id))
    const fetched = (response.value?.data || []).filter((s) => !liveIds.has(s.id))
    return [...liveRows.value, ...fetched].map(withVerdict)
})

watch(
    () => [pagination.value?.totalElements, liveRows.value.length] as const,
    ([total]) => {
        if (total === undefined) return
        const unlisted = liveRows.value.filter((r) => !(response.value?.data ?? []).some((s) => s.id === r.id)).length
        emit('count', total + unlisted)
    },
)

watch(
    () => displayRows.value[0] ?? null,
    (row) => emit('newest', row),
)

// "11/13" when the row carries its per-test results.
const testsOf = (sub: Submission) => {
    const rows = sub.details
    if (!rows?.length) return '-'
    return `${rows.filter((r) => r.result === 0).length}/${rows.length}`
}

// The list may leave the source out: then the submission is read once for it.
const { error: errorToast } = useToast()
const loadingId = ref<string | null>(null)
const loadCode = async (sub: Submission) => {
    if (sub.sourceCode) {
        emit('load', sub)
        return
    }
    loadingId.value = sub.id
    try {
        const res = await submissionService.getSubmissionById(sub.id)
        emit('load', res.data.data)
    } catch {
        errorToast("Couldn't load that submission's code")
    } finally {
        loadingId.value = null
    }
}

const addPendingSubmission = (sub: Submission) => {
    if (!liveRows.value.some((r) => r.id === sub.id)) {
        liveRows.value.unshift(sub) // status is PENDING(6) from the submit response
    }
    watchVerdict(sub.id, applyVerdict)
}

// History rows of the current page that this list watches (the pinned new submissions are watched on their own).
const watchedRows = new Set<string>()

watch(response, (r) => {
    const rows = r?.data || []
    const fetchedIds = new Set(rows.map((s) => s.id))
    // Once a finished submission shows up in a fresh fetch, drop its live copy so it
    // stops being pinned above the paginated list.
    liveRows.value = liveRows.value.filter(
        (row) => !(fetchedIds.has(row.id) && isTerminalStatus(withVerdict(row).status)),
    )
    const liveIds = new Set(liveRows.value.map((row) => row.id))
    // Rows that left the page stop streaming or polling; every row still judging gets a live verdict.
    for (const id of watchedRows) {
        if (!fetchedIds.has(id) && !liveIds.has(id)) {
            stopVerdict(id)
            watchedRows.delete(id)
        }
    }
    for (const row of rows) {
        if (isTerminalStatus(row.status) || liveIds.has(row.id)) continue
        watchedRows.add(row.id)
        watchVerdict(row.id, applyVerdict)
    }
})

watch(
    () => props.pendingSubmission,
    (sub) => {
        if (sub) {
            addPendingSubmission(sub)
            emit('consumed')
        }
    },
    { immediate: true },
)

const fetchSubmissions = () => {
    if (authStore.isAuthenticated && authStore.user) {
        execute(authStore.user.id, props.problemSlug, page.value, size.value)
    }
}

watch(
    () => [authStore.isAuthenticated, props.problemSlug],
    ([isAuthenticated]) => {
        if (isAuthenticated) {
            fetchSubmissions()
        } else {
            stopAllVerdicts() // logged out: a watch could only poll a 401
        }
    },
    { immediate: true },
)

const onPageChange = (newPage: number) => {
    page.value = newPage
    fetchSubmissions()
}

const onSizeChange = (newSize: number) => {
    size.value = newSize
    page.value = 0
    fetchSubmissions()
}
</script>
