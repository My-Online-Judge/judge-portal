<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>{{ mode === 'add' ? 'Add test case' : 'Edit test case' }}</DialogTitle>
                <DialogDescription v-if="oversized">
                    Too large to edit here — replace the files.
                </DialogDescription>
                <DialogDescription v-else>
                    Contestants judge against the new tests from the next submission.
                </DialogDescription>
            </DialogHeader>

            <form class="flex flex-col gap-4" novalidate @submit.prevent="onSave">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                            <Label for="tc-input">Input</Label>
                            <span v-if="!oversized" class="text-xs text-muted-foreground">{{ lines(inputText) }} lines</span>
                        </div>
                        <FilePicker v-if="oversized" v-model="inputFile" accept=".in,.txt" label="Replace .in" />
                        <Textarea
                            v-else
                            id="tc-input"
                            v-model="inputText"
                            rows="12"
                            class="font-mono text-xs"
                            placeholder="Input fed to the submission"
                        />
                    </div>
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                            <Label for="tc-output">Expected output</Label>
                            <span v-if="!oversized" class="text-xs text-muted-foreground">{{ lines(outputText) }} lines</span>
                        </div>
                        <FilePicker v-if="oversized" v-model="outputFile" accept=".out,.txt" label="Replace .out" />
                        <Textarea
                            v-else
                            id="tc-output"
                            v-model="outputText"
                            rows="12"
                            class="font-mono text-xs"
                            placeholder="Expected output"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="busy" @click="requestClose">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="!canSave">
                        <Loader2 v-if="busy" class="size-4 animate-spin" />
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <ConfirmDialog
        v-model:open="discardOpen"
        title="Discard unsaved changes?"
        description="Your edits to this test case are lost."
        confirm-label="Discard"
        @confirm="discard"
    />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FilePicker from '@/components/admin/problem/TestCaseFilePicker.vue'

const props = defineProps<{
    open: boolean
    mode: 'add' | 'edit'
    initial?: { input: string; output: string } | null
    oversized?: boolean
    busy?: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    save: [payload: { input: Blob; output: Blob }]
}>()

const inputText = ref('')
const outputText = ref('')
const inputFile = ref<File | null>(null)
const outputFile = ref<File | null>(null)
const discardOpen = ref(false)

// Re-seed whenever the dialog opens (or its source content arrives).
watch(
    () => [props.open, props.initial] as const,
    ([open]) => {
        if (!open) return
        inputText.value = props.initial?.input ?? ''
        outputText.value = props.initial?.output ?? ''
        inputFile.value = null
        outputFile.value = null
        discardOpen.value = false
    },
    { immediate: true },
)

const lines = (s: string) => (s === '' ? 0 : s.split('\n').length)

const dirty = computed(() =>
    props.oversized
        ? !!inputFile.value || !!outputFile.value
        : inputText.value !== (props.initial?.input ?? '') || outputText.value !== (props.initial?.output ?? ''),
)

const canSave = computed(() => {
    if (props.busy) return false
    if (props.oversized) return !!inputFile.value && !!outputFile.value
    return inputText.value.trim() !== '' && outputText.value.trim() !== ''
})

function requestClose() {
    if (props.busy) return
    if (dirty.value) discardOpen.value = true
    else emit('update:open', false)
}

function onOpenChange(value: boolean) {
    if (value) emit('update:open', true)
    else requestClose()
}

function discard() {
    discardOpen.value = false
    emit('update:open', false)
}

function onSave() {
    if (!canSave.value) return
    if (props.oversized) {
        emit('save', { input: inputFile.value!, output: outputFile.value! })
    } else {
        emit('save', { input: new Blob([inputText.value]), output: new Blob([outputText.value]) })
    }
}
</script>
