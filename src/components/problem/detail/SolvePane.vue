<template>
    <!-- Ctrl/Cmd+Enter anywhere in the pane submits. Inside the editor Monaco handles the keys itself
         (ProblemSubmit registers the same shortcut there) and stops them before they get here. -->
    <div class="h-full min-h-0" @keydown="onKeydown">
        <ResizablePanelGroup direction="vertical" auto-save-id="problem-solve-split">
            <ResizablePanel :default-size="EDITOR_SPLIT" :min-size="25"
                :class="view === 'result' ? '!hidden' : view === 'code' ? '!flex-[1_1_0%]' : ''">
                <section aria-label="Editor" class="h-full overflow-hidden rounded-xl border border-border bg-card">
                    <ProblemSubmit ref="submitRef" :languages="languages || undefined" :problem-slug="slug"
                        :actions-to="actionsTo" :contest-slug="contestSlug" :disabled-reason="disabledReason"
                        @success="onSubmit" @contest-not-running="emit('contest-not-running')" />
                </section>
            </ResizablePanel>
            <WorkspaceHandle aria-label="Resize console" :class="view ? '!hidden' : ''" />
            <ResizablePanel ref="consolePanel" :default-size="100 - EDITOR_SPLIT" :min-size="16" collapsible
                :collapsed-size="COLLAPSED_SIZE" :class="view === 'code' ? '!hidden' : view === 'result' ? '!flex-[1_1_0%]' : ''"
                @collapse="consoleCollapsed = true" @expand="consoleCollapsed = false">
                <section aria-label="Console" class="h-full overflow-hidden rounded-xl border border-border bg-card">
                    <Tabs v-model="tab" class="flex h-full min-h-0 flex-col gap-0">
                        <div class="flex h-11 flex-none items-stretch border-b border-border pr-1.5 pl-1">
                            <TabsList class="h-auto items-stretch gap-0.5 rounded-none bg-transparent p-0">
                                <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value"
                                    :data-test="`console-tab-${t.value}`" class="gap-2 px-3 text-sm">
                                    {{ t.label }}
                                    <span v-if="t.value === 'result' && resultMeta" :class="['console-badge', `v-${resultMeta.tone}`]">
                                        <span v-if="resultBusy" class="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" aria-hidden="true" />
                                        <template v-else>{{ resultMeta.code }}</template>
                                        <span class="sr-only">, {{ resultMeta.name }}</span>
                                    </span>
                                    <span v-if="t.value === 'submissions' && submissionCount" class="console-badge v-se"
                                        data-test="submission-count">{{ submissionCount }}</span>
                                </TabsTrigger>
                            </TabsList>
                            <span class="flex-1" />
                            <Button variant="ghost" size="icon-sm" class="self-center text-muted-foreground"
                                :class="view ? 'hidden' : ''"
                                :aria-label="consoleCollapsed ? 'Expand the console' : 'Collapse the console'"
                                :aria-expanded="!consoleCollapsed" @click="toggleConsole">
                                <ChevronUp v-if="consoleCollapsed" />
                                <ChevronDown v-else />
                            </Button>
                        </div>
                        <div class="min-h-0 flex-1 overflow-y-auto">
                            <TabsContent value="testcases" force-mount class="mt-0 data-[state=inactive]:hidden">
                                <TestcasesPanel ref="testcasesRef" :problem-slug="slug" :contest-slug="contestSlug"
                                    :sample-input="sampleInput" :sample-output="sampleOutput" />
                            </TabsContent>
                            <!-- The verdict console stays mounted on the other tabs: it holds the verdict stream. -->
                            <TabsContent value="result" force-mount class="mt-0 data-[state=inactive]:hidden">
                                <VerdictConsole :submission="latest" @judged="onJudged" />
                            </TabsContent>
                            <!-- Kept mounted for the count on its tab, its page and its live rows. -->
                            <TabsContent value="submissions" force-mount class="mt-0 data-[state=inactive]:hidden">
                                <ProblemSubmissions :problem-slug="slug" :pending-submission="unlisted"
                                    :highlight-id="latest?.id" @consumed="unlisted = null"
                                    @count="submissionCount = $event" @load="onLoad" @newest="newest = $event" />
                            </TabsContent>
                        </div>
                    </Tabs>
                </section>
            </ResizablePanel>
        </ResizablePanelGroup>

        <!-- Run sits before Submit in the page's action bar. -->
        <Teleport defer :to="actionsTo ?? 'body'" :disabled="!actionsTo">
            <Button v-if="authStore.isAuthenticated" variant="outline" size="sm"
                class="order-1 h-9 gap-2 bg-card px-3.5" data-test="run" :disabled="running || !!disabledReason"
                @click="run">
                <Loader2 v-if="running" class="animate-spin motion-reduce:animate-none" />
                <Play v-else class="size-3.5 fill-current" />
                {{ running ? 'Running…' : 'Run' }}
            </Button>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, provide, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, ChevronUp, Loader2, Play } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProblemSubmit from './ProblemSubmit.vue'
import ProblemSubmissions from './ProblemSubmissions.vue'
import TestcasesPanel from './TestcasesPanel.vue'
import VerdictConsole from './VerdictConsole.vue'
import WorkspaceHandle from './WorkspaceHandle.vue'
import { useLanguageStore } from '@/stores/language'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { SHOW_CONSOLE } from '@/lib/consoleReveal'
import { verdictMeta } from '@/lib/verdict'
import { isTerminalStatus, type Submission } from '@/types/submission'

defineProps<{
    slug: string
    // The page's action bar: Run and Submit render there. Without one they stay in this pane.
    actionsTo?: string
    // A phone shows one part at a time: the editor ('code') or the console ('result'). Unset: both, split.
    view?: 'code' | 'result'
    // The problem's sample, the first case on the Testcases tab.
    sampleInput?: string | null
    sampleOutput?: string | null
    // Passed on to ProblemSubmit: the running contest submissions count for, and why submitting is off.
    contestSlug?: string
    disabledReason?: string
}>()
const emit = defineEmits<{
    (e: 'judged', submission: Submission): void
    (e: 'contest-not-running'): void
    // The reader's latest submission with its current status: this page's, else the newest in the list.
    (e: 'last', submission: Submission | null): void
}>()

const authStore = useAuthStore()

// Editor share of the pane's height; the console takes the rest, or only its tab bar when collapsed.
const EDITOR_SPLIT = 60
const COLLAPSED_SIZE = 6

// This pane owns language loading: it fetches on mount. The store caches, so the call is idempotent.
const languageStore = useLanguageStore()
const { languages } = storeToRefs(languageStore)
onMounted(() => languageStore.fetchLanguages())

const submitRef = ref<InstanceType<typeof ProblemSubmit> | null>(null)
const testcasesRef = ref<InstanceType<typeof TestcasesPanel> | null>(null)
const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.defaultPrevented || e.isComposing) return
    e.preventDefault()
    submitRef.value?.submit()
}

type ConsoleTab = 'testcases' | 'result' | 'submissions'
const tab = ref<ConsoleTab>('testcases')
const tabs: { value: ConsoleTab; label: string }[] = [
    { value: 'testcases', label: 'Testcases' },
    { value: 'result', label: 'Result' },
    { value: 'submissions', label: 'Submissions' },
]

const consolePanel = ref<{ collapse: () => void; expand: () => void } | null>(null)
const consoleCollapsed = ref(false)
const toggleConsole = () => (consoleCollapsed.value ? consolePanel.value?.expand() : consolePanel.value?.collapse())

// The page can hide the console (a phone's other views). Showing a tab opens it, in view.
const showPane = inject(SHOW_CONSOLE, undefined)
const showTab = (t: ConsoleTab) => {
    tab.value = t
    if (consoleCollapsed.value) consolePanel.value?.expand()
    showPane?.()
}
provide(SHOW_CONSOLE, () => showTab('result'))

// --- Submit: the latest submission drives the Result tab and joins the Submissions list as a live row ---
const latest = ref<Submission | null>(null)
const unlisted = ref<Submission | null>(null)
const latestStatus = ref<number | null>(null)
const onSubmit = (submission: Submission) => {
    latest.value = submission
    unlisted.value = submission
    latestStatus.value = submission.status
    // A new submission brings its result forward; the code stays in the editor.
    showTab('result')
}
const onJudged = (verdict: Submission) => {
    latestStatus.value = verdict.status
    judged.value = verdict
    emit('judged', verdict)
}
const resultMeta = computed(() => (latestStatus.value === null ? null : verdictMeta(latestStatus.value)))
const resultBusy = computed(() => latestStatus.value !== null && !isTerminalStatus(latestStatus.value))

const submissionCount = ref(0)

const newest = ref<Submission | null>(null)
const judged = ref<Submission | null>(null)
watch(
    () => {
        if (!latest.value) return newest.value
        if (judged.value?.id === latest.value.id) return judged.value
        return { ...latest.value, status: latestStatus.value ?? latest.value.status }
    },
    (s) => emit('last', s),
)

// --- Run: the code against the Testcases tab's cases ---
const running = computed(() => !!testcasesRef.value?.running)
const { triggerToast } = useToast()
const run = async () => {
    const source = submitRef.value?.source()
    if (!source?.sourceCode.trim()) {
        triggerToast('Write some code before running it', 'error')
        return
    }
    showTab('testcases')
    await testcasesRef.value?.run(source)
}

// A past submission's code back in the editor.
const onLoad = (submission: Submission) => {
    submitRef.value?.loadCode(submission.sourceCode, submission.language?.identifier)
    triggerToast('Code loaded into the editor', 'success')
}
</script>
