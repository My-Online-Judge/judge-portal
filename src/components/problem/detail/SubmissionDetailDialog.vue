<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Submission #{{ submissionId?.substring(0, 8) }}</DialogTitle>
                <DialogDescription class="sr-only">Verdict and per-test results for this submission.</DialogDescription>
            </DialogHeader>
            <ListStateShell
                :loading="isLoading"
                :error="error ? 'error' : null"
                :has-data="!!submission"
                :empty="false"
                @retry="load"
            >
                <div v-if="submission" class="space-y-3">
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{{ submission.language?.name }}</span>
                        <span class="tabular">{{ submission.cpuTime != null ? `${submission.cpuTime} ms` : '—' }}</span>
                        <span class="tabular">
                            {{ submission.memory ? `${(submission.memory / (1024 * 1024)).toFixed(1)} MB` : '—' }}
                        </span>
                    </div>
                    <VerdictTiles :submission="submission" />
                </div>
            </ListStateShell>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ListStateShell from '@/components/common/ListStateShell.vue'
import VerdictTiles from './VerdictTiles.vue'
import submissionService from '@/services/submissionService'
import type { Submission } from '@/types/submission'

const props = defineProps<{ open: boolean; submissionId: string | null }>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const submission = ref<Submission | null>(null)
const isLoading = ref(false)
const error = ref(false)

async function load() {
    const id = props.submissionId
    if (!id) return
    isLoading.value = true
    error.value = false
    try {
        const res = await submissionService.getSubmissionById(id)
        if (props.submissionId === id) submission.value = res.data.data
    } catch {
        if (props.submissionId === id) error.value = true
    } finally {
        if (props.submissionId === id) isLoading.value = false
    }
}

watch(
    () => [props.open, props.submissionId] as const,
    ([open, id]) => {
        if (!open || !id) return
        if (submission.value?.id !== id) submission.value = null
        void load()
    },
    { immediate: true },
)
</script>
