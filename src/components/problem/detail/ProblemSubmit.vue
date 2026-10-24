<template>
    <div ref="rootEl" class="flex h-full min-h-0 flex-col bg-card">
        <!-- Toolbar: language and its compiler on the left; clear, settings and full screen on the right. -->
        <div class="flex h-11 flex-none items-center gap-2.5 border-b border-border pr-2 pl-2.5">
            <Select v-model="selectedLanguage">
                <SelectTrigger size="sm" class="h-[30px] w-[132px]" aria-label="Language">
                    <SelectValue>
                        {{ selectedLanguage ? selectedLanguage.name : 'Language' }}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem v-for="lang in languages" :key="lang.id" :value="lang">
                        {{ lang.name }}
                    </SelectItem>
                </SelectContent>
            </Select>
            <span v-if="compilerNote" class="hidden truncate text-xs text-muted-foreground md:inline"
                data-test="compiler-note">{{ compilerNote }}</span>

            <span class="flex-1" />

            <TooltipProvider :delay-duration="300">
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label="Clear the editor"
                            :disabled="!sourceCode" @click="isResetOpen = true">
                            <RotateCcw />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear the editor</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <DropdownMenuTrigger as-child>
                                <Button variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label="Editor settings">
                                    <SlidersHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Editor settings</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" class="w-48">
                        <DropdownMenuLabel class="text-xs font-medium text-muted-foreground">Theme</DropdownMenuLabel>
                        <DropdownMenuRadioGroup v-model="themeChoice">
                            <DropdownMenuRadioItem value="match">Same as the site</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="vs">Light</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="vs-dark">Dark</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel class="text-xs font-medium text-muted-foreground">Font size</DropdownMenuLabel>
                        <DropdownMenuRadioGroup v-model="fontSizeChoice">
                            <DropdownMenuRadioItem v-for="size in FONT_SIZES" :key="size" :value="String(size)">
                                {{ size }} px
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button variant="ghost" size="icon-sm" class="text-muted-foreground"
                            :aria-label="isFullscreen ? 'Exit full screen' : 'Full screen'" @click="toggleFullscreen">
                            <Minimize2 v-if="isFullscreen" />
                            <Maximize2 v-else />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{{ isFullscreen ? 'Exit full screen' : 'Full screen' }}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        <!-- Why Submit is off, under the toolbar. -->
        <p v-if="disabledReason" id="submit-disabled-reason"
            class="flex-none border-b border-border bg-muted/60 px-3.5 py-2 text-xs text-muted-foreground">
            {{ disabledReason }}
        </p>

        <!-- Editor fills the remaining height -->
        <div class="min-h-0 flex-1">
            <CodeEditor v-model="sourceCode" :language="editorLanguage" :theme="editorTheme" height="100%"
                :options="editorOptions" :disabled="isSubmitting" @mount="onEditorMount" />
        </div>

        <!-- Status bar: where the cursor is, and whether the draft is kept in this browser. -->
        <div class="flex h-7 flex-none items-center gap-4 border-t border-border px-3.5 text-xs text-muted-foreground">
            <span class="tabular">Ln {{ cursor.line }}, Col {{ cursor.column }}</span>
            <span class="hidden sm:inline">Spaces: {{ TAB_SIZE }}</span>
            <span class="flex-1" />
            <span v-if="draftSaved" class="inline-flex items-center gap-1.5" data-test="draft-status">
                <span class="size-1.5 rounded-full bg-[var(--v-ac)]" aria-hidden="true" />
                Draft saved
            </span>
        </div>

        <!-- Submit lives in the page's action bar (beside Run); without one it stays in this pane's toolbar row. -->
        <Teleport defer :to="actionsTo ?? 'body'" :disabled="!actionsTo">
            <div :class="actionsTo ? 'contents' : 'flex flex-none justify-end border-t border-border px-2.5 py-2'">
                <Button v-if="authStore.isAuthenticated" size="sm"
                    class="order-2 h-9 min-w-[112px] gap-2 px-3.5 aria-disabled:opacity-50"
                    aria-keyshortcuts="Control+Enter Meta+Enter" :aria-disabled="cooldownActive || undefined"
                    :aria-describedby="disabledReason ? 'submit-disabled-reason' : undefined"
                    :disabled="isSubmitting || sourceCode.trim() === '' || !!disabledReason" @click="handleSubmit">
                    <Loader2 v-if="isSubmitting" class="animate-spin motion-reduce:animate-none" />
                    <Timer v-else-if="cooldownActive" />
                    <Send v-else />
                    <span :class="{ 'tabular font-mono': cooldownActive && !isSubmitting }">
                        {{ isSubmitting ? 'Submitting…' : cooldownActive ? `Submit (${cooldownRemaining}s)` : 'Submit' }}
                    </span>
                    <kbd v-if="!isSubmitting && !cooldownActive" aria-hidden="true"
                        class="-mr-1.5 hidden rounded-[5px] bg-primary-foreground/18 px-1.5 py-0.5 font-mono text-xs leading-4 font-medium sm:inline">{{ shortcutLabel }}</kbd>
                </Button>
                <Button v-else size="sm" class="order-2 h-9 px-3.5" @click="isLoginOpen = true">Log in to submit</Button>
            </div>
        </Teleport>

        <ConfirmDialog v-model:open="isResetOpen" title="Clear the editor?"
            description="The code in the editor and its draft are removed. Your submissions keep their own copy."
            confirm-label="Clear" tone="neutral" @confirm="handleReset" />
        <LoginModal v-model:open="isLoginOpen" />
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Loader2, Maximize2, Minimize2, RotateCcw, Send, SlidersHorizontal, Timer } from 'lucide-vue-next'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Language } from '@/types/language'
import type { CodeEditorInstance, MonacoInstance } from '@/components/common/CodeEditor.vue'
import EditorPlaceholder from '@/components/common/EditorPlaceholder.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import LoginModal from '@/components/auth/LoginModal.vue'

import { ref, reactive, watch, computed, defineAsyncComponent, defineComponent, h, onBeforeUnmount } from 'vue'
import { useFullscreen } from '@vueuse/core'
import { isAxiosError } from 'axios'
import { useToast, type ToastHandle } from '@/composables/useToast'
import { useCooldown } from '@/composables/useCooldown'
import { useTheme } from '@/composables/useTheme'
import { getErrorMessage } from '@/lib/errorMessage'
import { busyFallbackMessage, isContestNotRunning, retryAfterSeconds } from '@/lib/submitErrors'
import { shouldShowTooFast, submissionToasts } from '@/lib/submissionToasts'
import submissionService from '@/services/submissionService'
import type { Submission, SubmissionRequest } from '@/types/submission'
import { getMonacoLanguage } from '@/utils/editorUtils'
import { readDraft, writeDraft } from '@/lib/codeDraft'
import { compilerNoteOf } from '@/lib/compilerNote'

// Monaco (3.7 MB) loads on its own: the page, and the statement beside this pane, render without waiting for it, and
// the editor area shows a skeleton until it arrives.
const CodeEditor = defineAsyncComponent({
    loader: () => import('@/components/common/CodeEditor.vue'),
    loadingComponent: defineComponent(() => () => h(EditorPlaceholder, { height: '100%' })),
    errorComponent: defineComponent({
        props: { error: { type: null, default: undefined } },
        setup: (p) => () => h(EditorPlaceholder, { error: p.error ?? true, height: '100%' }),
    }),
    delay: 0,
})

const authStore = useAuthStore()
const isLoginOpen = ref(false)

const props = defineProps<{
    languages?: Language[]
    problemSlug: string
    // A selector for the page's action bar, where Submit sits beside Run; without one Submit stays in this pane.
    actionsTo?: string
    // The running contest the submission counts for; absent for practice.
    contestSlug?: string
    // Set when this problem cannot be submitted to: the reason shows in the bar and Submit is off.
    disabledReason?: string
}>()

const emit = defineEmits<{
    (e: 'success', submission: Submission): void
    // The contest stopped running while the page was open: the page reads it again and switches to practice.
    (e: 'contest-not-running'): void
}>()

const { toasts, triggerToast, loading, error: errorToast, countdown } = useToast()

const selectedLanguage = ref<Language>()
const sourceCode = ref('')
const isSubmitting = ref(false)
const isResetOpen = ref(false)
// The Monaco editor, once it has mounted.
let editorInstance: CodeEditorInstance | null = null

// "Same as the site" follows the site theme; Light and Dark pin the editor to one.
const themeChoice = ref<'match' | 'vs' | 'vs-dark'>('match')
const { isDark } = useTheme()
const editorTheme = computed(() =>
    themeChoice.value === 'match' ? (isDark.value ? 'vs-dark' : 'vs') : themeChoice.value,
)

const TAB_SIZE = 4
const FONT_SIZES = [13, 14, 15, 16] as const
const fontSizeChoice = ref('14')
const editorOptions = computed(() => ({
    minimap: { enabled: false },
    fontSize: Number(fontSizeChoice.value),
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: TAB_SIZE,
}))

// The compiler behind the language, as a short note beside the picker ("g++ -std=c++17 -O2").
const compilerNote = computed(() => (selectedLanguage.value ? compilerNoteOf(selectedLanguage.value) : ''))

// Full screen takes the whole editor pane, toolbar and status bar included.
const rootEl = ref<HTMLElement | null>(null)
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootEl)

// Where the cursor is, for the status bar.
const cursor = reactive({ line: 1, column: 1 })

// The shortcut as this keyboard writes it, shown inside the Submit button.
const shortcutLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ ↵' : 'Ctrl ↵'

// Matches the API's oj.submission.cooldown-seconds (10s); a 429's Retry-After overrides it.
const COOLDOWN_SECONDS = 10
const { remaining: cooldownRemaining, active: cooldownActive, start: startCooldown } = useCooldown()

const editorLanguage = computed(() => {
    if (!selectedLanguage.value) return 'plaintext'
    return getMonacoLanguage(selectedLanguage.value)
})

// --- The draft: the code and its language, kept in this browser per problem ---
const draftSaved = ref(false)
const draft = readDraft(props.problemSlug)
if (draft) {
    sourceCode.value = draft.code
    draftSaved.value = true
}

// The draft's language once the list arrives, else the first one.
watch(
    () => props.languages,
    (list) => {
        if (!list?.length || selectedLanguage.value) return
        selectedLanguage.value = list.find((l) => l.identifier === draft?.languageIdentifier) ?? list[0]
    },
    { immediate: true },
)

// Saved a moment after typing stops, and on leaving.
const DRAFT_DELAY_MS = 600
let draftTimer: ReturnType<typeof setTimeout> | undefined
const saveDraft = () => {
    clearTimeout(draftTimer)
    draftTimer = undefined
    if (!selectedLanguage.value) return
    draftSaved.value = writeDraft(props.problemSlug, selectedLanguage.value.identifier, sourceCode.value)
}
watch([sourceCode, selectedLanguage], () => {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(saveDraft, DRAFT_DELAY_MS)
})
onBeforeUnmount(() => {
    if (draftTimer) saveDraft()
})

const handleReset = () => {
    isResetOpen.value = false
    sourceCode.value = ''
    saveDraft()
    triggerToast('Editor cleared', 'success')
    // The Reset button is disabled on an empty editor, so focus goes to the editor instead.
    editorInstance?.focus()
}

// When the current cooldown ends (epoch ms), so a press on the cooldown button can show the same toast.
const TOO_FAST = 'You are submitting too fast'
let cooldownUntil = 0
// What the countdown toast says for the current cooldown: the 429 copy, or a busy judge's message.
let cooldownReason = TOO_FAST
const beginCooldown = (seconds: number, reason: string = TOO_FAST) => {
    startCooldown(seconds)
    cooldownUntil = Date.now() + seconds * 1000
    cooldownReason = reason
}
// One "too fast" toast at a time: presses while it counts down don't stack more of them.
let tooFast: ToastHandle | undefined
// The cooldown end that toast counts to, so a 429 that moves the end updates it.
let tooFastFor = 0
const showTooFast = () => {
    const until = Math.max(cooldownUntil, Date.now() + 1000)
    if (shouldShowTooFast(tooFast?.id, toasts.value)) tooFast = countdown(cooldownReason, { until })
    else if (tooFast && tooFastFor !== cooldownUntil) tooFast.update({ until, title: cooldownReason })
    tooFastFor = cooldownUntil
}

const handleSubmit = async () => {
    if (isSubmitting.value || props.disabledReason) return
    if (cooldownActive.value) {
        showTooFast()
        return
    }
    if (!selectedLanguage.value) {
        triggerToast('Select a language first', 'error')
        return
    }
    if (!sourceCode.value.trim()) {
        triggerToast('Write some code before submitting', 'error')
        return
    }

    isSubmitting.value = true
    const pending = loading('Submitting…')
    try {
        const data: SubmissionRequest = {
            problemSlug: props.problemSlug,
            languageIdentifier: selectedLanguage.value.identifier,
            sourceCode: sourceCode.value,
            ...(props.contestSlug ? { contestSlug: props.contestSlug } : {}),
        }

        const res = await submissionService.submit(data)

        // The console turns this toast into the verdict when judging ends.
        pending.update({
            type: 'info',
            title: 'Submitted',
            description: 'Judging now. The result shows in the console below the editor.',
            duration: Infinity,
        })
        submissionToasts.set(res.data.data.id, pending)
        beginCooldown(COOLDOWN_SECONDS)
        // The code stays in the editor: the next attempt is usually a small fix to this one.

        emit('success', res.data.data)
    } catch (error) {
        pending.dismiss()
        // 429 (too fast) and 503 (judge busy) both push back with a wait; the countdown toast
        // shows it. A 503 keeps the server's message, a 429 keeps the design copy.
        const wait = retryAfterSeconds(error, COOLDOWN_SECONDS)
        if (wait !== null) {
            const busy = isAxiosError(error) && error.response?.status === 503
            beginCooldown(wait, busy ? busyFallbackMessage(error) : TOO_FAST)
            showTooFast()
        } else if (isAxiosError(error) && !error.response) {
            errorToast("Couldn't reach the server", {
                description: "Your submission wasn't sent. Check your connection.",
                action: { label: 'Retry', onClick: handleSubmit },
            })
        } else if (isContestNotRunning(error)) {
            // Nothing was submitted and the code stays in the editor; the page reloads the contest into practice.
            errorToast(getErrorMessage(error, 'Contest is not running'), {
                description: 'Your code is still in the editor. Submit again to practice.',
            })
            emit('contest-not-running')
        } else {
            triggerToast(getErrorMessage(error, 'Submission failed'), 'error')
        }
    } finally {
        isSubmitting.value = false
    }
}

// Ctrl/Cmd+Enter does what the Submit button does; signed out, it asks to log in like the button.
const requestSubmit = () => {
    if (!authStore.isAuthenticated) {
        isLoginOpen.value = true
        return
    }
    void handleSubmit()
}

// Monaco keeps the keys pressed inside it, so the shortcut is registered on the editor itself. The context
// key limits it to this editor, should another Monaco editor (a read-only one) be on the page.
const onEditorMount = (editor: CodeEditorInstance, monaco: MonacoInstance) => {
    editorInstance = editor
    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
        cursor.line = e.position.lineNumber
        cursor.column = e.position.column
    })
    editor.createContextKey('ojSubmitShortcut', true)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, requestSubmit, 'ojSubmitShortcut')
}

// Puts a submission's code back in the editor, in its language when that is still offered.
const loadCode = (code: string, languageIdentifier?: string) => {
    sourceCode.value = code
    const lang = props.languages?.find((l) => l.identifier === languageIdentifier)
    if (lang) selectedLanguage.value = lang
    editorInstance?.focus()
}

defineExpose({
    submit: requestSubmit,
    loadCode,
    // What Run sends: the code as it is now, and its language.
    source: () => ({ sourceCode: sourceCode.value, languageIdentifier: selectedLanguage.value?.identifier }),
})
</script>
