<template>
    <Card class="py-0">
        <CardContent class="p-0">
            <div v-if="!authStore.isAuthenticated" class="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <p class="mb-4">Please login to view your submissions</p>
                <Button @click="isLoginOpen = true">Login to View</Button>
            </div>

            <div v-else>
                <Table>
                    <TableHeader>
                        <TableRow class="bg-slate-50 hover:bg-slate-50">
                            <TableHead>ID</TableHead>
                            <TableHead>When</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Memory</TableHead>
                            <TableHead>Language</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-if="isLoading">
                            <TableCell colspan="6" class="text-center py-8 text-slate-500">
                                Loading submissions...
                            </TableCell>
                        </TableRow>
                        <TableRow v-else-if="error">
                            <TableCell colspan="6" class="text-center py-8 text-red-500">
                                Failed to load submissions
                            </TableCell>
                        </TableRow>
                        <TableRow v-else-if="displayRows.length === 0">
                            <TableCell colspan="6" class="text-center py-8 text-slate-500">
                                No submissions found
                            </TableCell>
                        </TableRow>
                        <TableRow v-else v-for="sub in displayRows" :key="sub.id">
                            <TableCell class="font-mono">#{{ sub.id.substring(0, 8) }}</TableCell>
                            <TableCell class="">{{ formatDateTime(sub.createdAt) }}</TableCell>
                            <TableCell>
                                <Badge :class="getStatusClass(sub.status)">
                                    <Loader2 v-if="!isTerminalStatus(sub.status)" class="h-3 w-3 animate-spin mr-1 inline" />
                                    {{ getSubmissionStatus(sub.status) }}
                                </Badge>
                            </TableCell>
                            <TableCell class="">
                                {{ sub.cpuTime != null ? `${sub.cpuTime}ms` : '--' }}
                            </TableCell>
                            <TableCell class="">
                                {{ sub.memory != null ? `${(sub.memory / (1024 * 1024)).toFixed(1)} MB` : '--' }}
                            </TableCell>
                            <TableCell class="">{{ sub.language?.name }}</TableCell>
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

const getStatusClass = (status: number) => {
    switch (status) {
        case SubmissionResult.SUCCESS:
            return 'bg-emerald-500 hover:bg-emerald-600 border-0 rounded-sm'
        case SubmissionResult.WRONG_ANSWER:
            return 'bg-red-500 hover:bg-red-600 border-0 rounded-sm'
        case SubmissionResult.COMPILE_ERROR:
            return 'bg-violet-500 hover:bg-violet-600 border-0 rounded-sm'
        case SubmissionResult.PARTIALLY_ACCEPTED:
            return 'bg-teal-500 hover:bg-teal-600 border-0 rounded-sm'
        case SubmissionResult.TIME_LIMIT_EXCEEDED:
        case SubmissionResult.REAL_TIME_LIMIT_EXCEEDED:
        case SubmissionResult.MEMORY_LIMIT_EXCEEDED:
            return 'bg-orange-500 hover:bg-orange-600 border-0 rounded-sm'
        case SubmissionResult.RUNTIME_ERROR:
        case SubmissionResult.SYSTEM_ERROR:
            return 'bg-yellow-500 hover:bg-yellow-600 border-0 rounded-sm'
        default:
            return 'bg-slate-500 hover:bg-slate-600 border-0 rounded-sm'
    }
}
</script>
