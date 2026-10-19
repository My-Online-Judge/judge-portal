<template>
    <Card class="border-border py-0 shadow-none">
        <CardContent class="p-0">
            <div v-if="!authStore.isAuthenticated" class="flex min-h-60 flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
                <span class="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <LogIn class="size-5" aria-hidden="true" />
                </span>
                <h4 class="text-sm font-semibold text-foreground">Log in to see your submissions</h4>
                <p class="max-w-xs text-sm text-muted-foreground">Your past attempts for this problem appear here.</p>
                <Button size="sm" @click="isLoginOpen = true">Log in</Button>
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
                            <TableRow class="border-border bg-muted/30 hover:bg-muted/30">
                                <TableHead v-for="head in heads" :key="head" class="text-xs font-medium text-muted-foreground">{{ head }}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow
                                v-for="sub in displayRows"
                                :key="sub.id"
                                tabindex="0"
                                role="button"
                                class="cursor-pointer border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                @click="openDetail(sub.id)"
                                @keydown.enter="openDetail(sub.id)"
                                @keydown.space.prevent="openDetail(sub.id)"
                            >
                                <TableCell class="tabular font-mono text-xs text-muted-foreground">#{{ sub.id.substring(0, 8) }}</TableCell>
                                <TableCell class="text-sm text-muted-foreground">{{ formatDateTime(sub.createdAt) }}</TableCell>
                                <TableCell>
                                    <VerdictChip :status="sub.status" />
                                </TableCell>
                                <TableCell class="tabular font-mono text-xs">
                                    {{ sub.cpuTime != null ? `${sub.cpuTime} ms` : '-' }}
                                </TableCell>
                                <TableCell class="tabular font-mono text-xs">
                                    {{ sub.memory ? `${(sub.memory / (1024 * 1024)).toFixed(1)} MB` : '-' }}
                                </TableCell>
                                <TableCell class="text-sm text-muted-foreground">{{ sub.language?.name ?? '-' }}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </ListStateShell>

                <div class="px-6 pb-6">
                    <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
                </div>
            </div>
        </CardContent>
        <LoginModal v-model:open="isLoginOpen" />
        <SubmissionDetailDialog v-model:open="isDetailOpen" :submission-id="detailId" />
    </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LogIn } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
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

const { watch: watchVerdict } = useSubmissionStream()
const liveRows = ref<Submission[]>([])

// Optimistic + streamed rows shown above the fetched page; dedupe so a row that
// later appears in the fetched page is not rendered twice.
const displayRows = computed(() => {
    const liveIds = new Set(liveRows.value.map((r) => r.id))
    const fetched = (response.value?.data || []).filter((s) => !liveIds.has(s.id))
    return [...liveRows.value, ...fetched]
})

const addPendingSubmission = (sub: Submission) => {
    if (!liveRows.value.some((r) => r.id === sub.id)) {
        liveRows.value.unshift(sub) // status is PENDING(6) from the submit response
    }
    watchVerdict(sub.id, (verdict) => {
        const idx = liveRows.value.findIndex((r) => r.id === verdict.id)
        if (idx !== -1) {
            liveRows.value.splice(idx, 1, { ...liveRows.value[idx], ...verdict })
        }
    })
}

// Once a finished submission shows up in a fresh fetch, drop its live copy so it
// stops being pinned above the paginated list.
watch(response, (r) => {
    const fetchedIds = new Set((r?.data || []).map((s) => s.id))
    liveRows.value = liveRows.value.filter(
        (row) => !(fetchedIds.has(row.id) && isTerminalStatus(row.status)),
    )
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
