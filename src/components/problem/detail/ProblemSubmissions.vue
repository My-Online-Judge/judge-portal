<template>
    <div>
        <div v-if="!authStore.isAuthenticated" class="flex min-h-60 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
            <LogIn class="size-5 text-muted-foreground" aria-hidden="true" />
            <h4 class="text-base font-semibold text-foreground">Log in to see your submissions</h4>
            <p class="max-w-xs text-base text-ink-2">Your past attempts for this problem appear here.</p>
            <!-- Outline: "Log in to submit" under the editor is the page's one filled button. -->
            <Button variant="outline" @click="isLoginOpen = true">Log in</Button>
        </div>

        <div v-else>
            <ListStateShell
                :loading="isLoading"
                :error="error ? 'Check your connection and try again.' : null"
                :has-data="!!response || displayRows.length > 0"
                :empty="displayRows.length === 0"
                empty-title="No submissions yet"
                empty-hint="Submit from the editor. Each attempt is listed here with its verdict."
                @retry="fetchSubmissions"
            >
                <Table>
                    <TableHeader>
                        <TableRow class="hover:bg-transparent">
                            <TableHead v-for="head in heads" :key="head" scope="col">{{ head }}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow
                            v-for="sub in displayRows"
                            :key="sub.id"
                            tabindex="0"
                            role="button"
                            class="cursor-pointer focus-visible:-outline-offset-2"
                            @click="openDetail(sub.id)"
                            @keydown.enter="openDetail(sub.id)"
                            @keydown.space.prevent="openDetail(sub.id)"
                        >
                            <TableCell class="font-mono text-xs text-muted-foreground">#{{ sub.id.substring(0, 8) }}</TableCell>
                            <TableCell class="text-sm text-ink-2 tabular-nums">{{ formatDateTime(sub.createdAt) }}</TableCell>
                            <TableCell>
                                <VerdictChip :status="sub.status" />
                            </TableCell>
                            <TableCell class="text-sm tabular-nums">
                                {{ sub.cpuTime != null ? `${sub.cpuTime} ms` : '-' }}
                            </TableCell>
                            <TableCell class="text-sm tabular-nums">
                                {{ sub.memory ? `${(sub.memory / (1024 * 1024)).toFixed(1)} MB` : '-' }}
                            </TableCell>
                            <TableCell class="text-sm text-ink-2">{{ sub.language?.name ?? '-' }}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </ListStateShell>

            <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
        </div>
        <LoginModal v-model:open="isLoginOpen" />
        <SubmissionDetailDialog v-model:open="isDetailOpen" :submission-id="detailId" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LogIn } from 'lucide-vue-next'
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

import { formatDateTime } from '@/utils/dateTimeUtils'
import { useSubmissionStream } from '@/composables/useSubmissionStream'
import type { Submission } from '@/types/submission'
import { isTerminalStatus } from '@/types/submission'
import VerdictChip from '@/components/common/VerdictChip.vue'

const props = defineProps<{
    problemSlug: string
    pendingSubmission?: Submission | null
}>()
const emit = defineEmits<{ (e: 'consumed'): void }>()

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
const heads = ['ID', 'When', 'Verdict', 'Time', 'Memory', 'Language']

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
            isLoginOpen.value = true
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
