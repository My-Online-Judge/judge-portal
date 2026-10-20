<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Submissions" description="Every submission, newest first. Open one to read its source, or judge it again.">
            <template v-if="canRejudge" #actions>
                <Button variant="secondary" @click="openRejudgeProblem">
                    <RotateCcw class="size-4" />
                    Rejudge problem…
                </Button>
            </template>
        </PageHeader>

        <!-- List card -->
        <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div class="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2.5">
                <div class="w-full sm:w-[200px]">
                    <Input v-model="fProblem" placeholder="Problem slug" class="font-mono" aria-label="Filter by problem slug" />
                </div>
                <div class="relative w-full sm:w-[180px]">
                    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input v-model="fUsername" type="search" placeholder="Username" class="pl-8" aria-label="Filter by username" />
                </div>
                <div class="w-[200px]">
                    <Select v-model="fResult">
                        <SelectTrigger class="w-full" aria-label="Result"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All results</SelectItem>
                            <SelectItem v-for="o in resultOptions" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="flex items-end gap-2">
                    <div class="flex flex-col gap-1">
                        <label for="sub-from" class="text-xs text-muted-foreground">From</label>
                        <Input id="sub-from" v-model="fFrom" type="date" class="w-[150px]" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="sub-to" class="text-xs text-muted-foreground">To</label>
                        <Input id="sub-to" v-model="fTo" type="date" class="w-[150px]" />
                    </div>
                    <Button v-if="hasFilters" variant="ghost" size="sm" class="h-9" @click="clearFilters">
                        <X class="size-4" />
                        Clear filters
                    </Button>
                </div>
                <p v-if="!rangeValid" class="w-full text-xs text-destructive-ink" role="alert">The start date must be before the end date.</p>
            </div>

            <ListStateShell
                :loading="isLoading"
                :error="error ? getErrorMessage(error, 'The request failed. Check your connection and try again.') : null"
                :has-data="data !== null"
                :empty="rows.length === 0"
                :filtered="hasFilters"
                empty-title="No submissions yet"
                empty-hint="Every solution submitted to the judge is listed here, newest first."
                @retry="load"
                @clear-filters="clearFilters"
            >
                <div class="overflow-x-auto">
                    <table class="dt min-w-[900px]">
                        <thead>
                            <tr>
                                <th class="pl-4">Time</th>
                                <th>User</th>
                                <th>Problem</th>
                                <th>Language</th>
                                <th>Verdict</th>
                                <th class="num">CPU</th>
                                <th class="num">Memory</th>
                                <th><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in rows" :key="s.id" class="cursor-pointer" @click="openView(s)">
                                <td class="pl-4 font-mono text-xs whitespace-nowrap">{{ formatDateTime(s.createdAt) }}</td>
                                <td>
                                    <RouterLink
                                        v-if="s.username"
                                        :to="`/u/${encodeURIComponent(s.username)}`"
                                        class="font-medium text-foreground hover:text-link hover:underline"
                                        @click.stop
                                    >{{ s.username }}</RouterLink>
                                    <span v-else class="text-muted-foreground">-</span>
                                </td>
                                <td>
                                    <RouterLink
                                        :to="{ name: 'ProblemDetail', params: { slug: s.problemSlug } }"
                                        class="font-mono text-xs text-foreground hover:text-link hover:underline"
                                        @click.stop
                                    >{{ s.problemSlug }}</RouterLink>
                                </td>
                                <td class="text-[13px] whitespace-nowrap">{{ s.language }}</td>
                                <td><VerdictChip :status="s.status" size="sm" /></td>
                                <td class="num">{{ formatMs(s.cpuTime) }}</td>
                                <td class="num">{{ formatMem(s.memory) }}</td>
                                <td class="act" @click.stop>
                                    <RowActionsMenu :items="rowActions(s)" :label="`submission #${shortId(s.id)}`" />
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

        <SubmissionDetailDialog :open="viewOpen" :submission-id="viewId" show-source @update:open="onViewOpenChange" />

        <ConfirmDialog
            :open="rejudgeOpen"
            :title="`Rejudge submission “#${shortId(rejudgeTarget?.id)}”?`"
            description="It is judged again with the problem's current test data. Statistics follow the new verdict."
            confirm-label="Rejudge"
            tone="neutral"
            :busy="rejudging"
            @update:open="(v) => (rejudgeOpen = v)"
            @confirm="confirmRejudge"
        />

        <ConfirmDialog
            :open="problemOpen"
            :title="problemSlug ? `Rejudge “${problemSlug}”?` : 'Rejudge a problem?'"
            description="Rejudges up to the 500 newest finished submissions of this problem, as many as the judge queue has room for."
            confirm-label="Rejudge"
            tone="neutral"
            :busy="problemRejudging"
            @update:open="(v) => (problemOpen = v)"
            @confirm="confirmRejudgeProblem"
        >
            <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Problem</span>
                    <ProblemPicker v-model="problemSlug" />
                    <p v-if="problemMissing" class="text-xs text-destructive-ink">Choose a problem.</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <Label for="rejudge-result">Submissions to rejudge</Label>
                    <Select v-model="problemResult">
                        <SelectTrigger id="rejudge-result" class="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All results</SelectItem>
                            <SelectItem v-for="o in verdictOptions" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </ConfirmDialog>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { isAxiosError } from 'axios'
import { Eye, RotateCcw, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import VerdictChip from '@/components/common/VerdictChip.vue'
import ProblemPicker from '@/components/admin/ProblemPicker.vue'
import type { RowAction } from '@/components/common/rowActions'
import { useFetch } from '@/composables/useFetch'
import { useSubmissionStream } from '@/composables/useSubmissionStream'
import { useToast } from '@/composables/useToast'
import { announceQueued } from '@/lib/rejudgeQueued'
import { getErrorMessage } from '@/lib/errorMessage'
import { parseRetryAfter } from '@/lib/retryAfter'
import { busyFallbackMessage } from '@/lib/submitErrors'
import { isValidRange } from '@/lib/dateRange'
import { verdictMeta } from '@/lib/verdict'
import { formatMem, formatMs } from '@/lib/verdictFormat'
import { formatDateTime } from '@/utils/dateTimeUtils'
import submissionService from '@/services/submissionService'
import { useAuthStore } from '@/stores/auth'
import { isTerminalStatus, SubmissionResult, type Submission, type SubmissionListItem, type SubmissionSearchParams } from '@/types/submission'

// Loaded on first use: the problem page imports this dialog too, so a static import here would move it (and its
// verdict tiles) into the chunk every page loads.
const SubmissionDetailDialog = defineAsyncComponent(() => import('@/components/problem/detail/SubmissionDetailDialog.vue'))

const authStore = useAuthStore()
const { triggerToast, error: errorToast, success: successToast, info: infoToast } = useToast()
const canRejudge = computed(() => authStore.hasPermission('submission:rejudge'))

// The API's Retry-After for a full judge queue (QUEUE_FULL), used when the header is missing.
const QUEUE_RETRY_SECONDS = 30

const FINAL_VERDICTS = [
    SubmissionResult.SUCCESS,
    SubmissionResult.WRONG_ANSWER,
    SubmissionResult.TIME_LIMIT_EXCEEDED,
    SubmissionResult.REAL_TIME_LIMIT_EXCEEDED,
    SubmissionResult.MEMORY_LIMIT_EXCEEDED,
    SubmissionResult.RUNTIME_ERROR,
    SubmissionResult.COMPILE_ERROR,
    SubmissionResult.SYSTEM_ERROR,
    SubmissionResult.PARTIALLY_ACCEPTED,
]
const option = (status: number) => ({ value: String(status), label: verdictMeta(status).name })
// A problem rejudge takes finished verdicts only; the search also finds the ones still in the queue.
const verdictOptions = FINAL_VERDICTS.map(option)
const resultOptions = [...FINAL_VERDICTS, SubmissionResult.PENDING, SubmissionResult.JUDGING].map(option)

const shortId = (id?: string) => (id ?? '').substring(0, 8)

// --- List and filters ---
const { data, isLoading, error, execute } = useFetch(submissionService.search, { immediate: false })
const rows = computed<SubmissionListItem[]>(() => data.value?.data ?? [])
const pagination = computed(() => data.value?.pagination ?? null)

const page = ref(0)
const size = ref(20)
const fProblem = ref('')
const fUsername = ref('')
const fResult = ref('all')
const fFrom = ref('')
const fTo = ref('')

const rangeValid = computed(() => isValidRange(fFrom.value, fTo.value))
const hasFilters = computed(
    () => !!fProblem.value || !!fUsername.value || fResult.value !== 'all' || !!fFrom.value || !!fTo.value,
)

const searchParams = (): SubmissionSearchParams => ({
    page: page.value,
    size: size.value,
    problemSlug: fProblem.value.trim() || undefined,
    username: fUsername.value.trim() || undefined,
    result: fResult.value === 'all' ? undefined : Number(fResult.value),
    from: fFrom.value || undefined,
    to: fTo.value || undefined,
})

// Counts the list loads, so a background refresh that a newer load overtook is dropped.
let loadSeq = 0
const load = () => {
    if (!rangeValid.value) return
    loadSeq += 1
    resetLiveRows()
    return execute(searchParams())
}

// Re-reads the current page without the spinner or a new error state; a failure keeps the rows on screen.
const refreshQuietly = async () => {
    if (!rangeValid.value) return
    const mine = loadSeq
    try {
        const res = await submissionService.search(new AbortController().signal, searchParams())
        if (mine === loadSeq) data.value = res.data
    } catch {
        // The next load or watch shows the problem.
    }
}

// --- Rows still being judged ---
// A few are watched live, and a verdict patches the row in place. The rest (a problem rejudge queues hundreds) wait for
// one list read on a backoff timer instead of a poll per row each.
const MAX_WATCHED_ROWS = 4
const LIST_REFRESH_FIRST_MS = 5000
const LIST_REFRESH_MAX_MS = 30_000
const LIST_REFRESH_DEADLINE_MS = 600_000

const stream = useSubmissionStream()
const watched = new Set<string>()
// Rows whose watch ended without a verdict: not watched again until the next explicit load.
const gaveUp = new Set<string>()

const patchRow = (id: string, verdict: Submission) => {
    const current = data.value
    if (!current) return
    data.value = {
        ...current,
        data: current.data.map((r) =>
            r.id === id ? { ...r, status: verdict.status, cpuTime: verdict.cpuTime ?? r.cpuTime, memory: verdict.memory ?? r.memory } : r,
        ),
    }
}

let listTimer: ReturnType<typeof setTimeout> | null = null
let listDelay = LIST_REFRESH_FIRST_MS
// When the list refresh of this load started; null until rows needed it.
let listStartedAt: number | null = null
let listExpired = false

const stopListRefresh = () => {
    if (listTimer !== null) clearTimeout(listTimer)
    listTimer = null
}
const resetLiveRows = () => {
    stopListRefresh()
    listDelay = LIST_REFRESH_FIRST_MS
    listStartedAt = null
    listExpired = false
    gaveUp.clear()
}

const scheduleListRefresh = () => {
    if (listTimer !== null || listExpired) return
    const now = Date.now()
    listStartedAt ??= now
    if (now + listDelay - listStartedAt > LIST_REFRESH_DEADLINE_MS) {
        listExpired = true
        return
    }
    listTimer = setTimeout(async () => {
        listTimer = null
        listDelay = Math.min(listDelay * 2, LIST_REFRESH_MAX_MS)
        await refreshQuietly()
        // A failed read leaves the rows as they were, so the watcher does not run: decide again here.
        followLiveRows(rows.value)
    }, listDelay)
}

function followLiveRows(list: SubmissionListItem[]) {
    const open = list.filter((r) => !isTerminalStatus(r.status)).map((r) => r.id)
    const openSet = new Set(open)
    for (const id of Array.from(watched)) {
        if (!openSet.has(id)) {
            stream.stop(id)
            watched.delete(id)
        }
    }
    for (const id of open) {
        if (watched.size >= MAX_WATCHED_ROWS) break
        if (watched.has(id) || gaveUp.has(id)) continue
        watched.add(id)
        stream.watch(
            id,
            (verdict) => {
                watched.delete(id)
                patchRow(id, verdict)
            },
            // The watch ended without a verdict: read the list again instead of leaving a stale row.
            () => {
                watched.delete(id)
                gaveUp.add(id)
                void refreshQuietly()
            },
        )
    }
    if (open.some((id) => !watched.has(id))) scheduleListRefresh()
    else stopListRefresh()
}

watch(rows, followLiveRows, { immediate: true })
onBeforeUnmount(stopListRefresh)

const clearFilters = () => {
    fProblem.value = ''
    fUsername.value = ''
    fResult.value = 'all'
    fFrom.value = ''
    fTo.value = ''
}

const reload = () => {
    page.value = 0
    load()
}
watchDebounced([fProblem, fUsername], reload, { debounce: 300 })
watch([fResult, fFrom, fTo], reload)

const onPageChange = (p: number) => {
    page.value = p
    load()
}
const onSizeChange = (n: number) => {
    size.value = n
    page.value = 0
    load()
}

// --- View: the detail dialog with the source ---
const viewOpen = ref(false)
const viewId = ref<string | null>(null)
// The dialog can rejudge or otherwise change the submission, so the list is read again when it closes.
const onViewOpenChange = (v: boolean) => {
    const wasOpen = viewOpen.value
    viewOpen.value = v
    if (wasOpen && !v) void refreshQuietly()
}
const openView = (s: SubmissionListItem) => {
    viewId.value = s.id
    viewOpen.value = true
}

const rowActions = (s: SubmissionListItem): RowAction[] => {
    const items: RowAction[] = [{ label: 'View', icon: Eye, onSelect: () => openView(s) }]
    if (canRejudge.value) {
        const finished = isTerminalStatus(s.status)
        items.push({
            label: 'Rejudge…',
            icon: RotateCcw,
            disabled: !finished,
            hint: finished ? undefined : 'Still being judged',
            onSelect: () => openRejudge(s),
        })
    }
    return items
}

// A full judge queue is 503 with Retry-After: say how long to wait.
function toastRejudgeError(err: unknown, fallback: string) {
    if (isAxiosError(err) && err.response?.status === 503) {
        const wait = parseRetryAfter(err.response.headers?.['retry-after'], QUEUE_RETRY_SECONDS)
        errorToast(busyFallbackMessage(err), { description: `Try again in ${wait} s.` })
    } else {
        triggerToast(getErrorMessage(err, fallback), 'error')
    }
}

// --- Rejudge one submission ---
const rejudgeOpen = ref(false)
const rejudgeTarget = ref<SubmissionListItem | null>(null)
const rejudging = ref(false)

const openRejudge = (s: SubmissionListItem) => {
    rejudgeTarget.value = s
    rejudgeOpen.value = true
}

const confirmRejudge = async () => {
    const target = rejudgeTarget.value
    if (!target || rejudging.value) return
    rejudging.value = true
    try {
        await submissionService.rejudge(target.id)
        triggerToast('Submission queued for judging', 'success')
        rejudgeOpen.value = false
        load()
    } catch (err) {
        toastRejudgeError(err, "Couldn't rejudge the submission")
    } finally {
        rejudging.value = false
    }
}

// --- Rejudge a whole problem ---
const problemOpen = ref(false)
const problemSlug = ref<string | null>(null)
const problemResult = ref('all')
const problemMissing = ref(false)
const problemRejudging = ref(false)

watch(problemSlug, () => (problemMissing.value = false))

const openRejudgeProblem = () => {
    problemSlug.value = null
    problemResult.value = 'all'
    problemMissing.value = false
    problemOpen.value = true
}

const confirmRejudgeProblem = async () => {
    if (problemRejudging.value) return
    const slug = problemSlug.value
    if (!slug) {
        problemMissing.value = true
        return
    }
    problemRejudging.value = true
    try {
        const status = problemResult.value === 'all' ? undefined : Number(problemResult.value)
        const res = await submissionService.rejudgeProblem(slug, status)
        const n = res.data.data.queued
        announceQueued(n, { success: successToast, info: infoToast })
        problemOpen.value = false
        load()
    } catch (err) {
        toastRejudgeError(err, "Couldn't rejudge the problem")
    } finally {
        problemRejudging.value = false
    }
}

onMounted(load)
</script>
