<template>
    <section class="rounded-xl border border-border bg-card">
        <!-- Panel header -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div class="flex items-center gap-2.5">
                <h3 class="text-base font-medium text-foreground">Test cases</h3>
                <Badge v-if="!loading && !loadError" variant="outline" class="font-mono">
                    {{ testCases.length }}
                </Badge>
            </div>
            <div v-if="canManage" class="flex flex-wrap items-center gap-2">
                <Button size="sm" @click="openAdd">
                    <Plus class="size-4" />
                    Add test case
                </Button>
                <label
                    class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
                    :class="busy ? 'pointer-events-none opacity-50' : ''"
                >
                    <Upload class="size-4" />
                    <span class="max-w-[9rem] truncate">{{ zipFile ? zipFile.name : 'Choose .zip' }}</span>
                    <input
                        ref="zipInput"
                        type="file"
                        accept=".zip"
                        class="sr-only"
                        :disabled="busy"
                        @change="onZipPick"
                    >
                </label>
                <Button size="sm" variant="outline" :disabled="!zipFile || busy" @click="doImport">
                    <Loader2 v-if="importing" class="size-4 animate-spin" />
                    Import
                </Button>
            </div>
        </div>

        <!-- Body -->
        <div class="p-5">
            <!-- Loading -->
            <div v-if="loading" class="flex flex-col gap-3">
                <div v-for="n in 2" :key="n" class="h-28 w-full rounded-lg bg-muted animate-ojpulse" />
            </div>

            <!-- Error -->
            <div
                v-else-if="loadError"
                class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-10 text-center"
            >
                <TriangleAlert class="size-6 text-err" />
                <p class="text-sm font-medium text-foreground">Couldn't load test cases.</p>
                <Button variant="outline" size="sm" @click="load">
                    <RefreshCw class="size-4" />
                    Retry
                </Button>
            </div>

            <!-- Empty -->
            <div
                v-else-if="testCases.length === 0"
                class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center"
            >
                <FileText class="size-6 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">No test cases yet — add one or import a zip.</p>
            </div>

            <!-- List -->
            <ul v-else class="flex flex-col gap-3">
                <li
                    v-for="tc in testCases"
                    :key="tc.id"
                    class="rounded-lg border border-border bg-background/50 p-4"
                >
                    <div class="mb-3 flex items-center justify-between gap-2">
                        <span class="truncate font-mono text-sm font-medium text-foreground">{{ tc.name }}</span>
                        <Button
                            v-if="canManage"
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            class="text-muted-foreground hover:text-destructive"
                            :disabled="busy"
                            :aria-label="`Delete test case ${tc.name}`"
                            @click="deleteTarget = tc"
                        >
                            <Trash2 class="size-4" />
                        </Button>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="space-y-1.5">
                            <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Input</p>
                            <pre class="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">{{ tc.input }}</pre>
                        </div>
                        <div class="space-y-1.5">
                            <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Output</p>
                            <pre class="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">{{ tc.output }}</pre>
                        </div>
                    </div>
                </li>
            </ul>
        </div>

        <!-- Add test case dialog -->
        <Dialog v-model:open="addOpen">
            <DialogContent class="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add test case</DialogTitle>
                    <DialogDescription>
                        Type the input/output, or upload <code class="font-mono">.in</code> /
                        <code class="font-mono">.out</code> files. A picked file wins over typed text.
                    </DialogDescription>
                </DialogHeader>

                <form class="flex flex-col gap-4" novalidate @submit.prevent="submitAdd">
                    <div class="space-y-1.5">
                        <Label for="tc-name">Name <span class="text-muted-foreground">(optional)</span></Label>
                        <Input id="tc-name" v-model="nameText" class="font-mono" placeholder="e.g. 01" />
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="space-y-1.5">
                            <Label for="tc-input">Input</Label>
                            <Textarea
                                id="tc-input"
                                v-model="inputText"
                                rows="6"
                                class="font-mono"
                                :disabled="!!inputFile"
                                placeholder="Input fed to the submission"
                            />
                            <FilePicker
                                v-model="inputFile"
                                accept=".in,.txt"
                                label="Upload .in"
                            />
                        </div>
                        <div class="space-y-1.5">
                            <Label for="tc-output">Output</Label>
                            <Textarea
                                id="tc-output"
                                v-model="outputText"
                                rows="6"
                                class="font-mono"
                                :disabled="!!outputFile"
                                placeholder="Expected output"
                            />
                            <FilePicker
                                v-model="outputFile"
                                accept=".out,.txt"
                                label="Upload .out"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" :disabled="busy" @click="addOpen = false">
                            Cancel
                        </Button>
                        <Button type="submit" :disabled="!canSubmitAdd">
                            <Loader2 v-if="adding" class="size-4 animate-spin" />
                            Add test case
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <!-- Delete confirm dialog -->
        <Dialog :open="!!deleteTarget" @update:open="(v) => { if (!v) deleteTarget = null }">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete test case?</DialogTitle>
                    <DialogDescription>
                        This permanently removes the test case. This can't be undone.
                    </DialogDescription>
                </DialogHeader>
                <div v-if="deleteTarget" class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="truncate font-mono text-sm text-foreground">{{ deleteTarget.name }}</p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="busy" @click="deleteTarget = null">
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" :disabled="busy" @click="confirmDelete">
                        <Loader2 v-if="deleting" class="size-4 animate-spin" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Upload, Loader2, RefreshCw, TriangleAlert, FileText } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import FilePicker from '@/components/admin/problem/TestCaseFilePicker.vue'
import { useToast } from '@/composables/useToast'
import testCaseService from '@/services/testCaseService'
import type { TestCase } from '@/types/testCase'

const props = defineProps<{
    slug: string
    canManage: boolean
}>()

const { triggerToast } = useToast()

const testCases = ref<TestCase[]>([])
const loading = ref(false)
const loadError = ref(false)

// One busy flag disables every mutation control while a request is in flight;
// the per-action flags below drive the individual spinners.
const busy = ref(false)
const adding = ref(false)
const importing = ref(false)
const deleting = ref(false)

const addOpen = ref(false)
const nameText = ref('')
const inputText = ref('')
const outputText = ref('')
const inputFile = ref<File | null>(null)
const outputFile = ref<File | null>(null)

const zipInput = ref<HTMLInputElement | null>(null)
const zipFile = ref<File | null>(null)

const deleteTarget = ref<TestCase | null>(null)

const hasInput = computed(() => !!inputFile.value || !!inputText.value.trim())
const hasOutput = computed(() => !!outputFile.value || !!outputText.value.trim())
const canSubmitAdd = computed(() => hasInput.value && hasOutput.value && !busy.value)

const errMsg = (e: unknown, fallback: string): string =>
    (axios.isAxiosError(e) && e.response?.data?.message) || fallback

let controller: AbortController | null = null

const load = async () => {
    controller?.abort()
    const ac = new AbortController()
    controller = ac
    loading.value = true
    loadError.value = false
    try {
        const res = await testCaseService.getTestCases(ac.signal, props.slug)
        if (controller !== ac) return
        testCases.value = res.data.data ?? []
    } catch (e) {
        if (controller !== ac || axios.isCancel(e)) return
        loadError.value = true
    } finally {
        if (controller === ac) loading.value = false
    }
}

const resetAddForm = () => {
    nameText.value = ''
    inputText.value = ''
    outputText.value = ''
    inputFile.value = null
    outputFile.value = null
}

const openAdd = () => {
    resetAddForm()
    addOpen.value = true
}

const submitAdd = async () => {
    const name = nameText.value.trim()
    const toFile = (file: File | null, text: string, ext: string): File | null => {
        if (file) return file
        if (!text.trim()) return null
        return new File([text], `${name || 'case'}.${ext}`, { type: 'text/plain' })
    }
    const inFile = toFile(inputFile.value, inputText.value, 'in')
    const outFile = toFile(outputFile.value, outputText.value, 'out')
    if (!inFile || !outFile) {
        triggerToast('Both input and output are required.', 'error')
        return
    }
    busy.value = true
    adding.value = true
    try {
        await testCaseService.addTestCase(props.slug, inFile, outFile)
        triggerToast('Test case added', 'success')
        addOpen.value = false
        resetAddForm()
        await load()
    } catch (e) {
        triggerToast(errMsg(e, 'Could not add the test case.'), 'error')
    } finally {
        busy.value = false
        adding.value = false
    }
}

const onZipPick = (e: Event) => {
    zipFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

const clearZip = () => {
    zipFile.value = null
    if (zipInput.value) zipInput.value.value = ''
}

const doImport = async () => {
    if (!zipFile.value) return
    busy.value = true
    importing.value = true
    try {
        const res = await testCaseService.importTestCases(props.slug, zipFile.value)
        const count = res.data.data?.length ?? 0
        triggerToast(`Imported ${count} test case${count === 1 ? '' : 's'}`, 'success')
        clearZip()
        await load()
    } catch (e) {
        triggerToast(errMsg(e, 'Could not import test cases.'), 'error')
    } finally {
        busy.value = false
        importing.value = false
    }
}

const confirmDelete = async () => {
    const target = deleteTarget.value
    if (!target) return
    busy.value = true
    deleting.value = true
    try {
        await testCaseService.remove(props.slug, target.id)
        triggerToast('Test case deleted', 'success')
        deleteTarget.value = null
        await load()
    } catch (e) {
        triggerToast(errMsg(e, 'Could not delete the test case.'), 'error')
    } finally {
        busy.value = false
        deleting.value = false
    }
}

// Reload when the host navigates to a different problem on the same instance.
watch(() => props.slug, () => {
    clearZip()
    load()
})

onMounted(load)
</script>
