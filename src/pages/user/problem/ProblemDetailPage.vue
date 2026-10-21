<template>
    <div class="animate-enter">
        <div v-if="needsLogin" class="flex flex-col items-center gap-3 py-20 text-center">
            <p class="text-sm text-muted-foreground">Log in to open this problem.</p>
            <div class="flex flex-wrap justify-center gap-2">
                <Button size="sm" @click="loginPrompt.request()">Log in</Button>
                <Button variant="secondary" size="sm" as-child>
                    <RouterLink :to="backTo">Back to the contest</RouterLink>
                </Button>
            </div>
        </div>

        <div v-else-if="isLoading || contestLoading" class="flex justify-center py-20">
            <Loading />
        </div>

        <div v-else-if="error || contestError" class="flex flex-col items-center gap-3 py-20 text-center">
            <!-- In a contest a 404 means hidden before the start, removed, or a wrong link: not a failure to retry. -->
            <template v-if="unavailable">
                <p class="text-sm font-semibold text-foreground">This problem is not available</p>
                <p class="text-sm text-muted-foreground">The contest may not have started yet, or the link is wrong.</p>
            </template>
            <p v-else class="text-destructive">Couldn't load this problem. Please try again.</p>
            <RouterLink v-if="contestSlug" :to="backTo" class="text-sm font-medium text-link hover:underline">Back to the contest</RouterLink>
        </div>

        <template v-else-if="problem">
            <!-- Page head: back link, title, meta bar (opens the statistics), tags -->
            <div class="mb-4 flex flex-col gap-3">
                <RouterLink :to="backTo"
                    class="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground hover:text-foreground">
                    <ChevronLeft class="size-4" aria-hidden="true" /> {{ backLabel }}
                </RouterLink>
                <ProblemHeader :problem="problem" />
                <!-- In a contest that is not running, submissions are practice: say so above the editor. -->
                <p v-if="contestNote" role="status"
                    class="flex items-center gap-2 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning-ink">
                    <Info class="size-4 shrink-0" aria-hidden="true" />
                    {{ contestNote }}
                </p>
            </div>

            <!-- 900 px and up: resizable split-pane (statement | solve) -->
            <div v-if="isDesktop"
                class="h-[calc(100vh-15rem)] min-h-[560px] overflow-hidden rounded-xl border border-border bg-background">
                <ResizablePanelGroup direction="horizontal" auto-save-id="problem-detail-split">
                    <ResizablePanel ref="statementPanel" :default-size="SPLIT_DEFAULT" :min-size="30">
                        <section id="problem-pane-problem" aria-label="Problem" class="h-full" />
                    </ResizablePanel>
                    <ResizableHandle with-handle aria-label="Resize panes" @dblclick="resetSplit"
                        @keydown.enter.prevent="resetSplit" />
                    <ResizablePanel :default-size="100 - SPLIT_DEFAULT" :min-size="30">
                        <section id="problem-pane-code" aria-label="Code" class="h-full" />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <!-- Narrower: a Problem | Code switch. Both views stay mounted, so the editor, the console and its
                 verdict stream survive the switch; the submit bar is pinned to the bottom in both. -->
            <div v-else>
                <div class="overflow-hidden rounded-xl border border-border bg-card">
                    <div class="border-b border-border px-3 py-2">
                        <div role="tablist" aria-label="View"
                            class="flex gap-0.5 rounded-lg border border-border bg-muted p-0.5" @keydown="onViewKeydown">
                            <button v-for="v in mobileViews" :id="`problem-view-tab-${v.key}`" :key="v.key" type="button"
                                role="tab" :aria-selected="mobileView === v.key"
                                :aria-controls="`problem-view-${v.key}`" :tabindex="mobileView === v.key ? 0 : -1"
                                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-[var(--shadow-sm)]"
                                @click="mobileView = v.key">
                                <component :is="v.icon" class="size-[15px]" aria-hidden="true" />
                                {{ v.label }}
                            </button>
                        </div>
                    </div>
                    <div class="h-[calc(100dvh-10rem)] min-h-[420px]">
                        <div v-show="mobileView === 'problem'" id="problem-view-problem" role="tabpanel"
                            aria-labelledby="problem-view-tab-problem" class="h-full" />
                        <div v-show="mobileView === 'code'" id="problem-view-code" role="tabpanel"
                            aria-labelledby="problem-view-tab-code" class="h-full" />
                    </div>
                </div>
                <!-- ProblemSubmit renders its submit bar in here. Full width, above the safe area. -->
                <div :id="SUBMIT_BAR_ID" ref="submitBarEl"
                    class="sticky bottom-0 z-30 -mx-4 bg-card pb-[env(safe-area-inset-bottom,0px)] md:-mx-6" />
            </div>

            <!-- One statement pane and one solve pane serve both layouts. Crossing 900 px moves them into the other
                 layout's slots instead of mounting new ones, so typed code, the console and its stream survive. -->
            <Teleport defer :to="isDesktop ? '#problem-pane-problem' : '#problem-view-problem'">
                <StatementPane :problem="problem" :slug="slug" :pending-submission="pendingSubmission"
                    @consumed="pendingSubmission = null" />
            </Teleport>
            <Teleport defer :to="isDesktop ? '#problem-pane-code' : '#problem-view-code'">
                <SolvePane :slug="slug" :submit-bar-to="isDesktop ? undefined : `#${SUBMIT_BAR_ID}`"
                    :contest-slug="submitContestSlug" :disabled-reason="disabledReason"
                    @success="handleSubmissionSuccess" @judged="refreshStats" @contest-not-running="loadContest" />
            </Teleport>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, watch, watchEffect, onBeforeUnmount, onMounted, provide } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useElementSize, useMediaQuery } from '@vueuse/core'
import { ChevronLeft, CodeXml, FileText, Info } from 'lucide-vue-next'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import ProblemHeader from '@/components/problem/detail/ProblemHeader.vue'
import StatementPane from '@/components/problem/detail/StatementPane.vue'
import { refreshStatsUntilChanged } from '@/lib/problemStats'
import { SHOW_CONSOLE } from '@/lib/consoleReveal'
import SolvePane from '@/components/problem/detail/SolvePane.vue'
import Loading from '@/components/common/Loading.vue'
import { Button } from '@/components/ui/button'
import { ROUTE_PATH } from '@/constants/routePath'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import contestService from '@/services/contestService'
import { useAuthStore } from '@/stores/auth'
import { ensureFreshSession } from '@/api/refreshSession'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import type { ContestDetail } from '@/types/contest'
import type { Submission } from '@/types/submission'

const route = useRoute()
const authStore = useAuthStore()

// Two routes render this page: /problems/:slug, and /contests/:contestSlug/problems/:label (contest mode), which reads
// the problem through the contest. Navigating between them reuses this component, so everything follows the route.
const contestSlug = computed(() => (route.params.contestSlug as string | undefined) ?? '')
const label = computed(() => (route.params.label as string | undefined) ?? '')
const routeKey = computed(() => (contestSlug.value ? `contest:${contestSlug.value}/${label.value}` : `problem:${route.params.slug}`))

const fetchProblem = (signal: AbortSignal) =>
    contestSlug.value
        ? contestService.getProblem(signal, contestSlug.value, label.value)
        : problemService.getProblemBySlug(signal, route.params.slug as string)

const pendingSubmission = ref<Submission | null>(null)

const isDesktop = useMediaQuery('(min-width: 900px)')

// Desktop split. Double-click or Enter on the divider puts it back to the default; reka keeps the arrow keys.
const SPLIT_DEFAULT = 46
const statementPanel = ref<{ resize: (size: number) => void } | null>(null)
const resetSplit = () => statementPanel.value?.resize(SPLIT_DEFAULT)

// Narrow screens: the Problem | Code switch (a tablist; arrows, Home and End move between the two).
type MobileView = 'problem' | 'code'
const mobileView = ref<MobileView>('problem')
const mobileViews = [
    { key: 'problem' as const, label: 'Problem', icon: FileText },
    { key: 'code' as const, label: 'Code', icon: CodeXml },
]
// The verdict console lives in the Code view; the verdict toast's View switches there before scrolling to it.
provide(SHOW_CONSOLE, () => {
    if (!isDesktop.value) mobileView.value = 'code'
})
const onViewKeydown = (e: KeyboardEvent) => {
    const at = mobileViews.findIndex((v) => v.key === mobileView.value)
    const moves: Record<string, number> = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: mobileViews.length - 1 }
    const next = moves[e.key]
    if (next === undefined) return
    e.preventDefault()
    const view = mobileViews[(next + mobileViews.length) % mobileViews.length]!
    mobileView.value = view.key
    document.getElementById(`problem-view-tab-${view.key}`)?.focus()
}

// The pinned submit bar covers the bottom of the screen, so lift the toasts above it while it is shown.
const SUBMIT_BAR_ID = 'problem-submit-bar'
const submitBarEl = ref<HTMLElement | null>(null)
const { height: submitBarHeight } = useElementSize(submitBarEl)
const rootStyle = document.documentElement.style
watchEffect(() => {
    if (!isDesktop.value && submitBarHeight.value > 0) {
        rootStyle.setProperty('--toast-offset', `${Math.round(submitBarHeight.value)}px`)
    } else {
        rootStyle.removeProperty('--toast-offset')
    }
})
onBeforeUnmount(() => rootStyle.removeProperty('--toast-offset'))

const {
    data: problem,
    isLoading,
    error,
    execute,
} = useFetch(fetchProblem, {
    immediate: false,
    transform: (res) => res.data,
})

// A contest's problems are for signed-in readers: a signed-out visitor gets the header's login dialog, and the problem
// once signed in (the Google sign-in comes back to this page, or a login in place re-runs this).
const loginPrompt = useLoginPrompt()
const needsLogin = ref(false)
// A newer load (the route changed) or leaving the page drops a load still waiting for the session.
let loadSeq = 0
const loadProblem = async () => {
    const mine = ++loadSeq
    // Wait for the session first: right after a reload the header's /auth/me (and the interceptor's refresh of a lapsed
    // cookie) may still be on its way. The problem read is public and answers a lapsed cookie as anonymous, so an
    // editor's draft would be a 404: a signed-in reader makes the session fresh before it.
    await authStore.ensureLoaded()
    if (mine !== loadSeq) return
    if (contestSlug.value && !authStore.user) {
        needsLogin.value = true
        loginPrompt.request()
        return
    }
    if (authStore.user) await ensureFreshSession()
    if (mine !== loadSeq) return
    needsLogin.value = false
    await execute()
}
onMounted(loadProblem)
onBeforeUnmount(() => loadSeq++)
watch(
    () => authStore.user?.id,
    (id) => {
        if (id && needsLogin.value) void loadProblem()
    },
)

// The problem's own slug: the editor's drafts and the submissions list are kept by it, in a contest too.
const slug = computed(() => (contestSlug.value ? (problem.value?.problemSlug ?? '') : (route.params.slug as string)))

// --- Contest mode: the contest's phase decides how a submission counts ---
const contest = shallowRef<ContestDetail | null>(null)
const contestLoading = ref(false)
const contestError = ref<unknown>(null)
let contestSeq = 0
let contestRead: AbortController | null = null

// Read on entry, and again when a submit finds the contest no longer running. A failed re-read keeps the last answer.
const loadContest = async () => {
    const mine = ++contestSeq
    contestRead?.abort()
    contestRead = null
    if (!contestSlug.value) {
        contest.value = null
        contestError.value = null
        contestLoading.value = false
        return
    }
    if (!contest.value) contestLoading.value = true
    const ctl = new AbortController()
    contestRead = ctl
    try {
        const res = await contestService.get(ctl.signal, contestSlug.value)
        if (mine !== contestSeq) return
        contest.value = res.data.data
        contestError.value = null
    } catch (err) {
        if (mine !== contestSeq) return
        if (!contest.value) contestError.value = err
    } finally {
        if (contestRead === ctl) contestRead = null
        if (mine === contestSeq) contestLoading.value = false
    }
}
void loadContest()
onBeforeUnmount(() => {
    contestSeq++
    contestRead?.abort()
})

const isNotFound = (err: unknown) => (err as { response?: { status?: number } } | null)?.response?.status === 404
const unavailable = computed(() => !!contestSlug.value && (isNotFound(error.value) || isNotFound(contestError.value)))

const INACTIVE = 0
// Only a published contest that is running takes the submission; after the end, before the start or in a draft (both
// seen by editors only) it is practice, so a draft never loops on the judge's "not running" refusal.
const submitContestSlug = computed(() =>
    contest.value?.status === 'PUBLISHED' && contest.value.phase === 'RUNNING' ? contestSlug.value : undefined,
)
const contestNote = computed(() => {
    if (contest.value?.phase === 'ENDED') return 'Practice: this contest has ended, so submissions do not count.'
    if (contest.value?.status === 'DRAFT') return 'Preview: this contest is a draft, so submissions do not count.'
    if (contest.value?.phase === 'UPCOMING') return 'Preview: this contest has not started, so submissions do not count.'
    return null
})
// A contest may hold an unpublished problem: once the contest is over, only problem editors may still submit to it.
const disabledReason = computed(() =>
    contest.value?.phase === 'ENDED' && problem.value?.status === INACTIVE && !authStore.hasPermission('problem:update')
        ? 'This problem opens for practice when an admin makes it public.'
        : undefined,
)

const backTo = computed(() => (contestSlug.value ? `${ROUTE_PATH.CONTESTS}/${contestSlug.value}` : ROUTE_PATH.PROBLEM))
const backLabel = computed(() => (contestSlug.value ? (contest.value?.title ?? 'Contest') : 'Problems'))

// Navigating problem → problem reuses this component, so setup() does not re-run
// and the mount-time fetch never fires again. Refetch + reset state on route change.
watch(routeKey, () => {
    pendingSubmission.value = null
    mobileView.value = 'problem'
    void loadProblem()
})
watch(contestSlug, () => {
    contest.value = null
    void loadContest()
})

const handleSubmissionSuccess = (submission: Submission) => {
    pendingSubmission.value = submission
}

// The statistics (meta-bar chips, stats dialog) come with the problem, fetched once on load. Once a submission has its
// verdict, fetch them again in the background — no loading state — and replace only those fields.
const refreshStats = async () => {
    if (!problem.value) return
    const fresh = await refreshStatsUntilChanged(
        async () => (await fetchProblem(new AbortController().signal)).data.data,
        problem.value.totalSubmission ?? 0,
    )
    if (fresh && problem.value) {
        problem.value.totalSubmission = fresh.totalSubmission
        problem.value.acceptedSubmission = fresh.acceptedSubmission
        problem.value.statisticInfo = fresh.statisticInfo
    }
}
</script>
