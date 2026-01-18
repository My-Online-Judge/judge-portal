<template>
    <Card>
        <CardContent class="p-6 space-y-6">
            <div class="flex items-end justify-between gap-3">
                <div class="w-30">
                    <Label class="mb-2 block text-sm font-medium text-slate-700">Language</Label>
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

                <div class="flex items-end gap-4">
                    <div class="flex flex-col w-[120px]">
                        <Label class="mb-2 block font-medium">Theme</Label>
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
                                        <Button size="icon" class="h-9 w-9 shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700"
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

            <CodeEditor v-model="sourceCode" :language="editorLanguage" :theme="selectedTheme" height="450px" :disabled="isSubmitting" />

            <div class="flex items-center justify-end gap-3">
                <template v-if="authStore.isAuthenticated">
                    <Button class="bg-blue-600 hover:bg-blue-700 pl-6 pr-6 cursor-pointer" @click="handleSubmit"
                        :disabled="isSubmitting || sourceCode.trim() === ''">
                        <Send class="h-4 w-4" />
                        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
                    </Button>
                </template>
                <template v-else>
                    <Button class="bg-slate-600 hover:bg-slate-700 pl-6 pr-6 cursor-pointer" @click="isLoginOpen = true">
                        Login to Submit
                    </Button>
                </template>
            </div>
        </CardContent>
        <LoginModal v-model:open="isLoginOpen" />
    </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/composables/useToast'
import submissionService from '@/services/submissionService'
import type { SubmissionRequest } from '@/types/submission'
import { getMonacoLanguage } from '@/utils/editorUtils'

const authStore = useAuthStore()
const isLoginOpen = ref(false)

const props = defineProps<{
    languages?: Language[]
    problemSlug: string
}>()

const emit = defineEmits<{
    (e: 'success'): void
}>()

const { triggerToast } = useToast()

const selectedLanguage = ref<Language>()
const selectedTheme = ref('vs-light')
const sourceCode = ref('')
const isSubmitting = ref(false)

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
    triggerToast('Code reset successful', 'success')
}

const handleSubmit = async () => {
    if (!selectedLanguage.value) {
        triggerToast('Please select a language', 'error')
        return
    }
    if (!sourceCode.value.trim()) {
        triggerToast('Source code cannot be empty', 'error')
        return
    }

    isSubmitting.value = true
    try {
        const data: SubmissionRequest = {
            problemSlug: props.problemSlug,
            languageIdentifier: selectedLanguage.value.identifier,
            sourceCode: sourceCode.value,
        }

        await submissionService.submit(data)

        triggerToast('Submitted', 'success')
        sourceCode.value = ''

        emit('success')
    } catch (error: any) {
        triggerToast(error.response?.data?.message || 'An error occurred', 'error')
    } finally {
        isSubmitting.value = false
    }
}
</script>
