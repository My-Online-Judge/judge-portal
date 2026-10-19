<template>
    <div class="flex h-full min-h-0 flex-col">
        <!-- Toolbar -->
        <div class="flex items-end justify-between gap-3 border-b border-border px-4 py-3">
            <div class="w-32">
                <Label class="mb-1.5 block text-xs font-medium text-muted-foreground">Language</Label>
                <Select v-model="selectedLanguage">
                    <SelectTrigger class="w-full">
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
            </div>

            <div class="flex items-end gap-3">
                <div class="flex w-[110px] flex-col">
                    <Label class="mb-1.5 block text-xs font-medium text-muted-foreground">Theme</Label>
                    <Select v-model="selectedTheme">
                        <SelectTrigger class="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vs-light">Light</SelectItem>
                            <SelectItem value="vs-dark">Dark</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Dialog>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <DialogTrigger as-child>
                                    <Button variant="outline" size="icon" class="h-9 w-9 shrink-0 cursor-pointer"
                                        :disabled="!sourceCode">
                                        <RotateCcw class="h-2 w-2" />
                                    </Button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Reset to default code definition</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset Code?</DialogTitle>
                            <DialogDescription>
                                This action will clear your current code in the editor. This action cannot be
                                undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose as-child>
                                <Button variant="outline" class="cursor-pointer">Cancel</Button>
                            </DialogClose>
                            <DialogClose as-child>
                                <Button variant="destructive" class="cursor-pointer" @click="handleReset">Reset</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <!-- Editor fills the remaining height -->
        <div class="min-h-0 flex-1 p-3">
            <CodeEditor v-model="sourceCode" :language="editorLanguage" :theme="selectedTheme" height="100%"
                :disabled="isSubmitting" />
        </div>

        <!-- Submit bar -->
        <div class="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
            <template v-if="authStore.isAuthenticated">
                <Button class="cursor-pointer px-6 aria-disabled:opacity-50" @click="handleSubmit"
                    :aria-disabled="cooldownActive || undefined"
                    :disabled="isSubmitting || sourceCode.trim() === ''">
                    <Send class="h-4 w-4" />
                    {{ isSubmitting ? 'Submitting…' : cooldownActive ? `Submit (${cooldownRemaining}s)` : 'Submit' }}
                </Button>
            </template>
            <template v-else>
                <Button class="cursor-pointer px-6" @click="isLoginOpen = true">
                    Login to Submit
                </Button>
            </template>
        </div>

        <LoginModal v-model:open="isLoginOpen" />
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RotateCcw, Send } from 'lucide-vue-next'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Language } from '@/types/language'
import CodeEditor from '@/components/common/CodeEditor.vue'
import { useAuthStore } from '@/stores/auth'
import LoginModal from '@/components/auth/LoginModal.vue'

import { ref, watch, computed } from 'vue'
import { isAxiosError } from 'axios'
import { useToast } from '@/composables/useToast'
import { useCooldown } from '@/composables/useCooldown'
import { getErrorMessage } from '@/lib/errorMessage'
import { retryAfterSeconds } from '@/lib/retryAfter'
import { submissionToasts } from '@/lib/submissionToasts'
import submissionService from '@/services/submissionService'
import type { Submission, SubmissionRequest } from '@/types/submission'
import { getMonacoLanguage } from '@/utils/editorUtils'

const authStore = useAuthStore()
const isLoginOpen = ref(false)

const props = defineProps<{
    languages?: Language[]
    problemSlug: string
}>()

const emit = defineEmits<{
    (e: 'success', submission: Submission): void
}>()

const { triggerToast, loading, error: errorToast, countdown } = useToast()

const selectedLanguage = ref<Language>()
const selectedTheme = ref('vs-light')
const sourceCode = ref('')
const isSubmitting = ref(false)

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
    sourceCode.value = ''
    triggerToast('Editor cleared', 'success')
}

// When the current cooldown ends (epoch ms), so a press on the cooldown button can show the same toast.
let cooldownUntil = 0
const beginCooldown = (seconds: number) => {
    startCooldown(seconds)
    cooldownUntil = Date.now() + seconds * 1000
}
const showTooFast = () =>
    countdown('You are submitting too fast', { until: Math.max(cooldownUntil, Date.now() + 1000) })

const handleSubmit = async () => {
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
        if (isAxiosError(error) && error.response?.status === 429) {
            const seconds = retryAfterSeconds(error.response.headers?.['retry-after'], COOLDOWN_SECONDS)
            beginCooldown(seconds)
            showTooFast()
        } else if (isAxiosError(error) && !error.response) {
            errorToast("Couldn't reach the server", {
                description: "Your submission wasn't sent. Check your connection.",
                action: { label: 'Retry', onClick: handleSubmit },
            })
        } else {
            triggerToast(getErrorMessage(error, 'Submission failed'), 'error')
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>
