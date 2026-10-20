<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Import from package</DialogTitle>
                <DialogDescription>
                    Choose a .zip exported from this judge, up to 50 MB. It becomes a new problem with its test cases.
                </DialogDescription>
            </DialogHeader>

            <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
                <div class="space-y-1.5">
                    <Label for="import-file">Package</Label>
                    <FilePicker input-id="import-file" v-model="file" accept=".zip" label="Choose .zip" />
                    <p v-if="sizeError" class="text-xs text-destructive-ink">{{ sizeError }}</p>
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
                    <Button type="button" variant="outline" @click="onOpenChange(false)">
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import axios from 'axios'
import JSZip from 'jszip'
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
import { ensureFreshSession } from '@/api/refreshSession'
import { getErrorMessage } from '@/lib/errorMessage'
import type { Problem } from '@/types/problem'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
    'update:open': [value: boolean]
    imported: [problem: Problem]
}>()

// The server's multipart limit for one file.
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024
const SLUG_TAKEN = 'A problem with this slug already exists. Set a different slug.'

const file = ref<File | null>(null)
const slugOverride = ref('')
const busy = ref(false)
const serverError = ref<string | null>(null)
// The running import's controller: closing the dialog aborts it.
let controller: AbortController | null = null

// Same rule as the create form's slug, but empty is allowed (the package's own slug is used).
const slugError = computed(() =>
    /^[a-zA-Z0-9-]*$/.test(slugOverride.value) ? null : 'Use letters, numbers and hyphens only.',
)
const sizeError = computed(() =>
    file.value && file.value.size > MAX_PACKAGE_BYTES ? 'This file is larger than 50 MB.' : null,
)
const canSubmit = computed(() => !!file.value && !sizeError.value && !slugError.value && !busy.value)

// Start clean each time the dialog opens; closing it cancels a running import.
watch(
    () => props.open,
    (open) => {
        if (!open) {
            controller?.abort()
            return
        }
        file.value = null
        slugOverride.value = ''
        serverError.value = null
    },
)

// Another package may carry another slug.
watch(file, () => (serverError.value = null))

function onOpenChange(value: boolean) {
    if (!value) controller?.abort()
    emit('update:open', value)
}

onBeforeUnmount(() => controller?.abort())

function finish(problem: Problem) {
    emit('imported', problem)
    emit('update:open', false)
}

// The slug in a package's problem.json, matched by file name in any folder as the server does; null when the file is
// not a readable package.
async function readPackageSlug(zipFile: File): Promise<string | null> {
    try {
        const zip = await JSZip.loadAsync(zipFile)
        const entry = Object.values(zip.files)
            .filter((f) => !f.dir && f.name.split(/[\\/]/).pop() === 'problem.json')
            .pop()
        if (!entry) return null
        const pkg = JSON.parse(await entry.async('string')) as { problem?: { problemSlug?: unknown } }
        const slug = pkg.problem?.problemSlug
        return typeof slug === 'string' && slug.trim() ? slug.trim() : null
    } catch {
        return null
    }
}

// The problem with this slug; null when there is none (404), undefined when that cannot be told.
async function findProblem(slug: string, signal: AbortSignal): Promise<Problem | null | undefined> {
    try {
        await ensureFreshSession()
        return (await problemService.getProblemBySlug(signal, slug)).data.data
    } catch (err) {
        return axios.isAxiosError(err) && err.response?.status === 404 ? null : undefined
    }
}

// No answer at all, or a gateway or timeout status that a proxy gives while the service may still have finished.
const AMBIGUOUS_STATUSES = [408, 502, 503, 504]
const isAmbiguous = (err: unknown) =>
    axios.isAxiosError(err) && (!err.response || AMBIGUOUS_STATUSES.includes(err.response.status))

// The slug is looked up before the upload, so a taken slug fails without sending the file, and again when the
// response is lost (a timeout or a dropped connection), so a problem the server did create is reported as created
// instead of failing with 409 on a retry.
async function onSubmit() {
    if (!canSubmit.value || !file.value) return
    const picked = file.value
    const ctl = new AbortController()
    controller = ctl
    busy.value = true
    serverError.value = null
    try {
        const slug = slugOverride.value.trim() || (await readPackageSlug(picked))
        const before = slug ? await findProblem(slug, ctl.signal) : undefined
        if (ctl.signal.aborted) return
        if (before) {
            serverError.value = SLUG_TAKEN
            return
        }
        try {
            const res = await problemService.importPackage(picked, slugOverride.value, ctl.signal)
            finish(res.data.data)
        } catch (err) {
            if (axios.isCancel(err) || ctl.signal.aborted) {
                // A cancel can arrive after the whole body was sent: if the slug was free before and exists now, the
                // server created it, so say so instead of closing silently over it.
                const after = slug && before === null ? await findProblem(slug, new AbortController().signal) : undefined
                if (after) emit('imported', after)
                return
            }
            if (isAmbiguous(err)) {
                // Only a slug known to be free before the upload proves the import when it exists now.
                const after = slug && before === null ? await findProblem(slug, ctl.signal) : undefined
                if (ctl.signal.aborted) return
                if (after) finish(after)
                else if (after === undefined)
                    serverError.value = 'The import may have completed. Check the problems list before retrying.'
                // Not created. A gateway status did arrive, so its message (a busy service, say) beats "your connection".
                else if (axios.isAxiosError(err) && err.response)
                    serverError.value = getErrorMessage(err, 'Could not import the package. Try again in a moment.')
                else serverError.value = 'Could not import the package. Check your connection and try again.'
                return
            }
            serverError.value =
                axios.isAxiosError(err) && err.response?.status === 409
                    ? SLUG_TAKEN
                    : getErrorMessage(err, 'Could not import the package.')
        }
    } finally {
        if (controller === ctl) {
            controller = null
            busy.value = false
        }
    }
}
</script>
