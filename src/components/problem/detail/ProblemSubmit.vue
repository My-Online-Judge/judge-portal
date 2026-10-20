<template>
    <div class="flex h-full min-h-0 flex-col">
        <!-- Toolbar -->
        <div class="flex h-[45px] flex-none items-center gap-2 border-b border-border px-2.5">
            <Select v-model="selectedLanguage">
                <SelectTrigger size="sm" class="w-[140px]" aria-label="Language">
                    <SelectValue>
                        {{ selectedLanguage ? selectedLanguage.name : 'Select a language' }}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem v-for="lang in languages" :key="lang.id" :value="lang">
                        {{ lang.name }}
                    </SelectItem>
                </SelectContent>
            </Select>

            <Select v-model="themeChoice">
                <SelectTrigger size="sm" class="w-[120px]" aria-label="Editor theme">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="match">Match app</SelectItem>
                    <SelectItem value="vs">Light</SelectItem>
                    <SelectItem value="vs-dark">Dark</SelectItem>
                </SelectContent>
            </Select>

            <span class="flex-1" />

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button variant="ghost" size="icon-sm" aria-label="Reset code" :disabled="!sourceCode"
                            @click="isResetOpen = true">
                            <RotateCcw />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset code</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        <!-- Editor fills the remaining height -->
        <div class="min-h-0 flex-1">
            <CodeEditor v-model="sourceCode" :language="editorLanguage" :theme="editorTheme" height="100%"
                :disabled="isSubmitting" @mount="onEditorMount" />
        </div>

        <!-- Submit bar. On a phone the page pins it to the bottom of the screen, outside this pane. -->
        <Teleport defer :to="submitBarTo ?? 'body'" :disabled="!submitBarTo">
            <div class="flex flex-none items-center gap-2.5 border-t border-border bg-card py-2 pr-2.5 pl-3.5">
                <span v-if="disabledReason" id="submit-disabled-reason" class="min-w-0 text-xs text-muted-foreground">{{ disabledReason }}</span>
                <span v-else class="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex" aria-hidden="true">
                    <kbd v-for="key in ['Ctrl', '↵']" :key="key"
                        class="rounded-[4px] border border-b-2 border-input bg-card px-[5px] font-mono text-[11px] text-foreground">{{ key }}</kbd>
                    submits
                </span>
                <span class="flex-1" />
                <Button v-if="authStore.isAuthenticated" class="min-w-[122px] aria-disabled:opacity-50"
                    aria-keyshortcuts="Control+Enter Meta+Enter" :aria-disabled="cooldownActive || undefined"
                    :aria-describedby="disabledReason ? 'submit-disabled-reason' : undefined"
                    :disabled="isSubmitting || sourceCode.trim() === '' || !!disabledReason" @click="handleSubmit">
                    <Loader2 v-if="isSubmitting" class="animate-spin motion-reduce:animate-none" />
                    <Timer v-else-if="cooldownActive" />
                    <Send v-else />
                    <span :class="{ 'tabular font-mono': cooldownActive && !isSubmitting }">
                        {{ isSubmitting ? 'Submitting…' : cooldownActive ? `Submit (${cooldownRemaining}s)` : 'Submit' }}
                    </span>
                </Button>
                <Button v-else @click="isLoginOpen = true">Log in to submit</Button>
            </div>
        </Teleport>

        <ConfirmDialog v-model:open="isResetOpen" title="Clear the editor?"
            description="Your current code for this problem is removed." confirm-label="Clear code" tone="neutral"
            @confirm="handleReset" />
        <LoginModal v-model:open="isLoginOpen" />
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, Send, Timer } from 'lucide-vue-next'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Language } from '@/types/language'
import CodeEditor, { type CodeEditorInstance, type MonacoInstance } from '@/components/common/CodeEditor.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import LoginModal from '@/components/auth/LoginModal.vue'

import { ref, watch, computed } from 'vue'
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

const authStore = useAuthStore()
const isLoginOpen = ref(false)

const props = defineProps<{
    languages?: Language[]
    problemSlug: string
    // A selector to render the submit bar into instead of below the editor (the page's bar pinned on phones).
    submitBarTo?: string
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

// "Match app" follows the site theme; Light and Dark pin the editor to one.
const themeChoice = ref<'match' | 'vs' | 'vs-dark'>('match')
const { isDark } = useTheme()
const editorTheme = computed(() =>
    themeChoice.value === 'match' ? (isDark.value ? 'vs-dark' : 'vs') : themeChoice.value,
)

// Matches the API's oj.submission.cooldown-seconds (10s); a 429's Retry-After overrides it.
const COOLDOWN_SECONDS = 10
const { remaining: cooldownRemaining, active: cooldownActive, start: startCooldown } = useCooldown()

const editorLanguage = computed(() => {
    if (!selectedLanguage.value) return 'plaintext'
    return getMonacoLanguage(selectedLanguage.value)
})

watch(
    () => props.languages,
    (newVal) => {
        if (newVal && newVal.length > 0 && !selectedLanguage.value) {
            const firstLang = newVal[0]
            if (firstLang) {
                selectedLanguage.value = firstLang
            }
        }
    },
    { immediate: true },
)

const handleReset = () => {
    isResetOpen.value = false
    sourceCode.value = ''
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
            description: 'Judging now. The verdict appears below the editor.',
            duration: Infinity,
        })
        submissionToasts.set(res.data.data.id, pending)
        beginCooldown(COOLDOWN_SECONDS)
        sourceCode.value = ''

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
    editor.createContextKey('ojSubmitShortcut', true)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, requestSubmit, 'ojSubmitShortcut')
}

defineExpose({ submit: requestSubmit })
</script>
