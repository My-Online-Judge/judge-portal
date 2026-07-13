<template>
    <Card class="border-border py-0 shadow-none">
        <CardContent class="p-0">
            <div v-if="!authStore.isAuthenticated" class="flex flex-col items-center justify-center gap-4 p-14 text-center">
                <p class="text-muted-foreground">Sign in to see your submissions for this problem.</p>
                <Button @click="isLoginOpen = true">Sign in</Button>
            </div>

            <div v-else>
                <Table>
                    <TableHeader>
                        <TableRow class="border-border bg-muted/30 hover:bg-muted/30">
                            <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</TableHead>
                            <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">When</TableHead>
                            <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                            <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</TableHead>
                            <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Memory</TableHead>
                            <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Language</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <template v-if="isLoading">
                            <TableRow v-for="n in 5" :key="`sk-${n}`" class="border-border hover:bg-transparent">
                                <TableCell v-for="c in 6" :key="c" class="py-4">
                                    <div class="h-3.5 animate-pulse rounded bg-muted" :class="c === 3 ? 'w-16' : 'w-20'"></div>
                                </TableCell>
                            </TableRow>
                        </template>
                        <TableRow v-else-if="error" class="hover:bg-transparent">
                            <TableCell colspan="6" class="py-10 text-center text-destructive">
                                Couldn't load submissions. Please try again.
                            </TableCell>
                        </TableRow>
                        <TableRow v-else-if="displayRows.length === 0" class="hover:bg-transparent">
                            <TableCell colspan="6" class="py-16 text-center">
                                <p class="font-display text-2xl text-foreground">No submissions yet</p>
                                <p class="mt-1.5 text-sm text-muted-foreground">Solve it from the Submit tab — your attempts show up here in real time.</p>
                            </TableCell>
                        </TableRow>
                        <TableRow v-else v-for="sub in displayRows" :key="sub.id" class="border-border transition-colors hover:bg-muted/40">
                            <TableCell class="tabular text-sm text-muted-foreground">#{{ sub.id.substring(0, 8) }}</TableCell>
                            <TableCell class="text-sm text-muted-foreground">{{ formatDateTime(sub.createdAt) }}</TableCell>
                            <TableCell>
                                <Badge :class="getStatusClass(sub.status)">
                                    <Loader2 v-if="!isTerminalStatus(sub.status)" class="mr-1 inline h-3 w-3 animate-spin" />
                                    {{ getSubmissionStatus(sub.status) }}
                                </Badge>
                            </TableCell>
                            <TableCell class="tabular text-sm">
                                {{ sub.cpuTime != null ? `${sub.cpuTime} ms` : '—' }}
                            </TableCell>
                            <TableCell class="tabular text-sm">
                                {{ sub.memory ? `${(sub.memory / (1024 * 1024)).toFixed(1)} MB` : '—' }}
                            </TableCell>
                            <TableCell class="text-sm text-muted-foreground">{{ sub.language?.name }}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div class="px-6 pb-6">
                    <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
                </div>
            </div>
        </CardContent>
        <LoginModal v-model:open="isLoginOpen" />
    </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useAuthStore } from '@/stores/auth'
import submissionService from '@/services/submissionService'
import { useFetch } from '@/composables/useFetch'

import { formatDateTime } from '@/utils/dateTimeUtils'
import { Loader2 } from 'lucide-vue-next'
import { useSubmissionStream } from '@/composables/useSubmissionStream'
import type { Submission } from '@/types/submission'
import { SubmissionResult, getSubmissionStatus, isTerminalStatus } from '@/types/submission'

const props = defineProps<{
    problemSlug: string
    pendingSubmission?: Submission | null
}>()
const emit = defineEmits<{ (e: 'consumed'): void }>()

const authStore = useAuthStore()
const isLoginOpen = ref(false)
const page = ref(0)
const size = ref(10)

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

// Muted pastel status chips (warm-monochrome palette) — semantic color only,
// square-ish, uppercase, tracked. No saturated fills, no pill.
const CHIP = 'rounded-md border-0 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide'
const getStatusClass = (status: number) => {
    switch (status) {
        case SubmissionResult.SUCCESS:
            return `${CHIP} bg-[#EAF3EA] text-[#356635]`
        case SubmissionResult.WRONG_ANSWER:
            return `${CHIP} bg-[#FBEBEC] text-[#9E2F2D]`
        case SubmissionResult.COMPILE_ERROR:
            return `${CHIP} bg-[#F1EDF9] text-[#5B3E9F]`
        case SubmissionResult.PARTIALLY_ACCEPTED:
            return `${CHIP} bg-[#E6F1F0] text-[#2C6E68]`
        case SubmissionResult.TIME_LIMIT_EXCEEDED:
        case SubmissionResult.REAL_TIME_LIMIT_EXCEEDED:
        case SubmissionResult.MEMORY_LIMIT_EXCEEDED:
            return `${CHIP} bg-[#FBF2D8] text-[#8A5A00]`
        case SubmissionResult.RUNTIME_ERROR:
        case SubmissionResult.SYSTEM_ERROR:
            return `${CHIP} bg-[#FBEADF] text-[#9A4A1F]`
        default:
            return `${CHIP} bg-[#F0EFEC] text-[#6B6862]`
    }
}
</script>
