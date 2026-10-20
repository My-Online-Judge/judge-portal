<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Import from package</DialogTitle>
                <DialogDescription>
                    Choose a .zip exported from this judge. It becomes a new problem with its test cases.
                </DialogDescription>
            </DialogHeader>

            <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
                <div class="space-y-1.5">
                    <Label for="import-file">Package</Label>
                    <FilePicker input-id="import-file" v-model="file" accept=".zip" label="Choose .zip" />
                </div>

                <div class="space-y-1.5">
                    <Label for="import-slug">Slug override (optional)</Label>
                    <Input
                        id="import-slug"
                        v-model="slugOverride"
                        placeholder="Keep the slug from the package"
                        autocomplete="off"
                        :aria-invalid="!!slugError || undefined"
                        @input="serverError = null"
                    />
                    <p v-if="slugError" class="text-xs text-destructive-ink">{{ slugError }}</p>
                </div>

                <p v-if="serverError" role="alert" class="text-xs text-destructive-ink">{{ serverError }}</p>

                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="busy" @click="emit('update:open', false)">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="!canSubmit">
                        <Loader2 v-if="busy" class="size-4 animate-spin" />
                        Import
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import FilePicker from '@/components/admin/problem/TestCaseFilePicker.vue'
import problemService from '@/services/problemService'
import { getErrorMessage } from '@/lib/errorMessage'
import type { Problem } from '@/types/problem'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
    'update:open': [value: boolean]
    imported: [problem: Problem]
}>()

const file = ref<File | null>(null)
const slugOverride = ref('')
const busy = ref(false)
const serverError = ref<string | null>(null)

// Same rule as the create form's slug, but empty is allowed (the package's own slug is used).
const slugError = computed(() =>
    /^[a-zA-Z0-9-]*$/.test(slugOverride.value) ? null : 'Use letters, numbers and hyphens only.',
)
const canSubmit = computed(() => !!file.value && !slugError.value && !busy.value)

// Start clean each time the dialog opens.
watch(
    () => props.open,
    (open) => {
        if (!open) return
        file.value = null
        slugOverride.value = ''
        serverError.value = null
    },
)

function onOpenChange(value: boolean) {
    // A running import cannot be cancelled: keep the dialog until it settles.
    if (!value && busy.value) return
    emit('update:open', value)
}

async function onSubmit() {
    if (!canSubmit.value || !file.value) return
    busy.value = true
    serverError.value = null
    try {
        const res = await problemService.importPackage(file.value, slugOverride.value)
        emit('imported', res.data.data)
        emit('update:open', false)
    } catch (err) {
        serverError.value =
            axios.isAxiosError(err) && err.response?.status === 409
                ? 'A problem with this slug already exists. Set a different slug.'
                : getErrorMessage(err, 'Could not import the package.')
    } finally {
        busy.value = false
    }
}
</script>
