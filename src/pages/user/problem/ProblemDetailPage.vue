<template>
    <div class="animate-enter">
        <div v-if="isLoading" class="flex justify-center py-20">
            <Loading />
        </div>

        <div v-else-if="error" class="py-20 text-center text-destructive">
            Couldn't load this problem. Please try again.
        </div>

        <template v-else-if="problem">
            <!-- Header -->
            <div class="mb-4 space-y-3">
                <RouterLink :to="ROUTE_PATH.PROBLEM"
                    class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                    <ChevronLeft class="h-4 w-4" /> Problems
                </RouterLink>
                <ProblemHeader :problem="problem" />
                <ProblemMetaBar :problem="problem" />
            </div>

            <!-- Desktop: resizable split-pane (statement | solve) -->
            <div v-if="isDesktop"
                class="h-[calc(100vh-15rem)] min-h-[560px] overflow-hidden rounded-xl border border-border bg-card">
                <ResizablePanelGroup direction="horizontal" auto-save-id="problem-detail-split">
                    <ResizablePanel :default-size="46" :min-size="30">
                        <StatementPane :problem="problem" :slug="slug" :pending-submission="pendingSubmission"
                            @consumed="pendingSubmission = null" />
                    </ResizablePanel>
                    <ResizableHandle with-handle />
                    <ResizablePanel :default-size="54" :min-size="30">
                        <SolvePane :slug="slug" @success="handleSubmissionSuccess" />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <!-- Narrow: segmented toggle, one pane at a time -->
            <div v-else class="overflow-hidden rounded-xl border border-border bg-card">
                <div class="flex gap-1 border-b border-border p-1.5">
                    <button v-for="v in mobileViews" :key="v.key" type="button" @click="mobileView = v.key"
                        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                        :class="mobileView === v.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'">
                        {{ v.label }}
                    </button>
                </div>
                <div class="h-[70vh] min-h-[520px]">
                    <StatementPane v-if="mobileView === 'problem'" :problem="problem" :slug="slug"
                        :pending-submission="pendingSubmission" @consumed="pendingSubmission = null" />
                    <SolvePane v-else :slug="slug" @success="handleSubmissionSuccess" />
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { ChevronLeft } from 'lucide-vue-next'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import ProblemHeader from '@/components/problem/detail/ProblemHeader.vue'
import ProblemMetaBar from '@/components/problem/detail/ProblemMetaBar.vue'
import StatementPane from '@/components/problem/detail/StatementPane.vue'
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

const isDesktop = useMediaQuery('(min-width: 1024px)')
const mobileView = ref<'problem' | 'code'>('problem')
const mobileViews = [
    { key: 'problem' as const, label: 'Problem' },
    { key: 'code' as const, label: 'Code' },
]

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
</script>
