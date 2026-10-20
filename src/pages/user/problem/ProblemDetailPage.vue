<template>
    <div class="animate-enter">
        <div v-if="isLoading" class="flex justify-center py-20">
            <Loading />
        </div>

        <div v-else-if="error" class="py-20 text-center text-destructive">
            Couldn't load this problem. Please try again.
        </div>

        <template v-else-if="problem">
            <!-- Page head: back link, title, meta bar (opens the statistics), tags -->
            <div class="mb-4 flex flex-col gap-3">
                <RouterLink :to="ROUTE_PATH.PROBLEM"
                    class="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground hover:text-foreground">
                    <ChevronLeft class="size-4" aria-hidden="true" /> Problems
                </RouterLink>
                <ProblemHeader :problem="problem" />
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
                    @success="handleSubmissionSuccess" @judged="refreshStats" />
            </Teleport>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onBeforeUnmount, provide } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useElementSize, useMediaQuery } from '@vueuse/core'
import { ChevronLeft, CodeXml, FileText } from 'lucide-vue-next'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import ProblemHeader from '@/components/problem/detail/ProblemHeader.vue'
import StatementPane from '@/components/problem/detail/StatementPane.vue'
import { refreshStatsUntilChanged } from '@/lib/problemStats'
import { SHOW_CONSOLE } from '@/lib/consoleReveal'
import SolvePane from '@/components/problem/detail/SolvePane.vue'
import Loading from '@/components/common/Loading.vue'
import { ROUTE_PATH } from '@/constants/routePath'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import type { Submission } from '@/types/submission'

const route = useRoute()
// Reactive so the value stays correct (and flows to child panes) across
// client-side navigation between two problems, which reuses this component.
const slug = computed(() => route.params.slug as string)
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
} = useFetch(problemService.getProblemBySlug, {
    params: slug.value,
    transform: (res) => res.data,
})

// Navigating problem → problem reuses this component, so setup() does not re-run
// and the mount-time fetch never fires again. Refetch + reset state on slug change.
watch(
    () => route.params.slug,
    (newSlug) => {
        pendingSubmission.value = null
        mobileView.value = 'problem'
        execute(newSlug as string)
    },
)

const handleSubmissionSuccess = (submission: Submission) => {
    pendingSubmission.value = submission
}

// The statistics (meta-bar chips, stats dialog) come with the problem, fetched once on load. Once a submission has its
// verdict, fetch them again in the background — no loading state — and replace only those fields.
const refreshStats = async () => {
    if (!problem.value) return
    const fresh = await refreshStatsUntilChanged(
        async () => (await problemService.getProblemBySlug(new AbortController().signal, slug.value)).data.data,
        problem.value.totalSubmission ?? 0,
    )
    if (fresh && problem.value) {
        problem.value.totalSubmission = fresh.totalSubmission
        problem.value.acceptedSubmission = fresh.acceptedSubmission
        problem.value.statisticInfo = fresh.statisticInfo
    }
}
</script>
