<template>
    <section class="rounded-xl border border-border bg-card">
        <!-- Panel header -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 class="text-base font-medium text-foreground">Test cases</h3>
                <span v-if="!loading && !loadError" class="text-sm text-muted-foreground">{{ summary }}</span>
            </div>
            <div v-if="canManage" class="flex flex-wrap items-center gap-2">
                <Button size="sm" :disabled="busy" @click="openAdd">
                    <Plus class="size-4" />
                    Add test case
                </Button>
                <Button size="sm" variant="outline" :disabled="busy" @click="zipInput?.click()">
                    <Upload class="size-4" />
                    Import zip…
                </Button>
                <input
                    ref="zipInput"
                    type="file"
                    accept=".zip"
                    class="sr-only"
                    tabindex="-1"
                    aria-label="Choose test-case zip"
                    @change="onZipPick"
                >
            </div>
        </div>

        <ListStateShell
            :loading="loading"
            :error="loadError ? 'load' : null"
            :has-data="loaded"
            :empty="testCases.length === 0"
            @retry="load"
        >
            <template #empty>
                <div class="p-5">
                    <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                        <FileText class="size-6 text-muted-foreground" />
                        <p class="text-sm text-muted-foreground">No test cases yet — add one or import a zip.</p>
                    </div>
                </div>
            </template>

            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <th class="px-5 py-2.5">#</th>
                            <th class="px-3 py-2.5">Sample</th>
                            <th class="px-3 py-2.5">Input</th>
                            <th class="px-3 py-2.5">Output</th>
                            <th v-if="canManage" class="w-12 px-3 py-2.5"><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="tc in testCases" :key="tc.id" class="border-b border-border last:border-b-0">
                            <td class="px-5 py-2.5 align-middle font-mono font-medium text-foreground">{{ tc.name }}</td>
                            <td class="px-3 py-2.5 align-middle">
                                <div class="flex items-center gap-2">
                                    <Switch
                                        :model-value="tc.sample"
                                        :disabled="!canManage || switching.has(tc.id)"
                                        :aria-label="`Open test case ${tc.name}`"
                                        @update:model-value="(v: boolean) => onToggle(tc, v)"
                                    />
                                    <span class="w-12 text-xs text-muted-foreground">{{ tc.sample ? 'Sample' : 'Hidden' }}</span>
                                </div>
                            </td>
                            <td class="max-w-[16rem] px-3 py-2.5 align-middle">
                                <p class="text-[11px] text-muted-foreground">{{ formatSize(tc.inputSize) }}</p>
                                <p class="truncate font-mono text-xs text-foreground">{{ firstLine(tc.inputPreview) }}</p>
                            </td>
                            <td class="max-w-[16rem] px-3 py-2.5 align-middle">
                                <p class="text-[11px] text-muted-foreground">{{ formatSize(tc.outputSize) }}</p>
                                <p class="truncate font-mono text-xs text-foreground">{{ firstLine(tc.outputPreview) }}</p>
                            </td>
                            <td v-if="canManage" class="px-3 py-2.5 text-right align-middle">
                                <RowActionsMenu :label="`test case ${tc.name}`" :items="actionsFor(tc)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </ListStateShell>

        <p v-if="!loadError" class="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            Contestants judge against the new tests from the next submission
        </p>

        <!-- Add / edit -->
        <TestCaseDialog
            v-model:open="dialogOpen"
            :mode="dialogMode"
            :initial="dialogInitial"
            :oversized="dialogOversized"
            :busy="saving"
            @save="onSave"
        />

        <!-- Hidden → open -->
        <ConfirmDialog
            :open="openOpen"
            :title="`Make test case ${openTarget?.name ?? ''} open?`"
            description="Contestants will see its input, expected output and their own output in every submission of this problem, including past ones."
            confirm-label="Make open"
            :destructive="false"
            @update:open="(v) => (openOpen = v)"
            @confirm="confirmOpen"
        />

        <!-- Delete -->
        <ConfirmDialog
            :open="deleteOpen"
            :title="`Delete test case ${deleteTarget?.name ?? ''}?`"
            description="The problem is re-packaged without it."
            confirm-label="Delete"
            :busy="deleting"
            @update:open="(v) => (deleteOpen = v)"
            @confirm="confirmDelete"
        />

        <!-- Import zip -->
        <ConfirmDialog
            :open="zipOpen"
            :title="`Import test cases from ${zipName}?`"
            :description="`They are added after the existing ${testCases.length} test cases.`"
            confirm-label="Import"
            :destructive="false"
            :busy="importing"
            @update:open="(v) => { if (!v) clearZip() }"
            @confirm="doImport"
        />
    </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import axios from 'axios'
import { Plus, Upload, FileText, Pencil, Download, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import type { RowAction } from '@/components/common/rowActions'
import TestCaseDialog from '@/components/admin/problem/TestCaseDialog.vue'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import { downloadText } from '@/lib/download'
import testCaseService from '@/services/testCaseService'
import type { TestCaseSummary } from '@/types/testCase'

// Files over 1 MiB are replaced through file pickers instead of edited inline.
const EDIT_LIMIT_BYTES = 1048576

const props = defineProps<{
    slug: string
    canManage: boolean
}>()

const { triggerToast } = useToast()

const testCases = ref<TestCaseSummary[]>([])
const loading = ref(false)
const loadError = ref(false)
const loaded = ref(false)

const switching = reactive(new Set<string>())
const saving = ref(false)
const deleting = ref(false)
const importing = ref(false)
const busy = computed(() => saving.value || deleting.value || importing.value)

const dialogOpen = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const dialogInitial = ref<{ input: string; output: string } | null>(null)
const dialogOversized = ref(false)
const editing = ref<TestCaseSummary | null>(null)

// Targets stay set after their dialog closes so the title survives the close animation.
const openTarget = ref<TestCaseSummary | null>(null)
const openOpen = ref(false)
const deleteTarget = ref<TestCaseSummary | null>(null)
const deleteOpen = ref(false)
const zipOpen = ref(false)
const zipName = ref('')
const zipInput = ref<HTMLInputElement | null>(null)
const zipFile = ref<File | null>(null)

const summary = computed(() => {
    const n = testCases.value.length
    const m = testCases.value.filter((t) => t.sample).length
    return `${n} ${n === 1 ? 'test' : 'tests'} · ${m} sample`
})

const firstLine = (s: string) => s.split('\n')[0]

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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
        loaded.value = true
    } catch (e) {
        if (controller !== ac || axios.isCancel(e)) return
        loadError.value = true
    } finally {
        if (controller === ac) loading.value = false
    }
}

const replaceRow = (row: TestCaseSummary) => {
    testCases.value = testCases.value.map((t) => (t.id === row.id ? row : t))
}

// Sample/Hidden switch. The switch is controlled, so a failed request leaves it where it was.
const onToggle = (tc: TestCaseSummary, value: boolean) => {
    if (value) {
        openTarget.value = tc
        openOpen.value = true
    }
    else void applySample(tc, false)
}

const applySample = async (tc: TestCaseSummary, sample: boolean) => {
    switching.add(tc.id)
    try {
        const res = await testCaseService.setSample(props.slug, tc.id, sample)
        // Merge only the flag: whatever shape the response has, the row keeps its sizes and previews.
        replaceRow({ ...tc, sample: res.data.data?.sample ?? sample })
    } catch (e) {
        triggerToast(getErrorMessage(e, 'Could not change the test case.'), 'error')
    } finally {
        switching.delete(tc.id)
    }
}

const confirmOpen = async () => {
    const tc = openTarget.value
    openOpen.value = false
    if (tc) await applySample(tc, true)
}

const openAdd = () => {
    editing.value = null
    dialogMode.value = 'add'
    dialogInitial.value = null
    dialogOversized.value = false
    dialogOpen.value = true
}

const openEdit = async (tc: TestCaseSummary) => {
    editing.value = tc
    dialogMode.value = 'edit'
    if (tc.inputSize > EDIT_LIMIT_BYTES || tc.outputSize > EDIT_LIMIT_BYTES) {
        dialogInitial.value = null
        dialogOversized.value = true
        dialogOpen.value = true
        return
    }
    try {
        const res = await testCaseService.getTestCase(props.slug, tc.id)
        const full = res.data.data
        dialogInitial.value = { input: full?.input ?? '', output: full?.output ?? '' }
        dialogOversized.value = false
        dialogOpen.value = true
    } catch (e) {
        triggerToast(getErrorMessage(e, 'Could not load the test case.'), 'error')
    }
}

const onSave = async ({ input, output }: { input: Blob; output: Blob }) => {
    saving.value = true
    try {
        if (editing.value) {
            const res = await testCaseService.updateTestCase(props.slug, editing.value.id, input, output)
            if (res.data.data) replaceRow(res.data.data)
            triggerToast('Test case updated', 'success')
        } else {
            await testCaseService.addTestCase(props.slug, input, output)
            triggerToast('Test case added', 'success')
        }
        dialogOpen.value = false
        await load()
    } catch (e) {
        triggerToast(getErrorMessage(e, 'Could not save the test case.'), 'error')
    } finally {
        saving.value = false
    }
}

const download = async (tc: TestCaseSummary) => {
    try {
        const res = await testCaseService.getTestCase(props.slug, tc.id)
        const full = res.data.data
        if (!full) return
        downloadText(`${tc.name}.in`, full.input)
        downloadText(`${tc.name}.out`, full.output)
    } catch (e) {
        triggerToast(getErrorMessage(e, 'Could not download the test case.'), 'error')
    }
}

const actionsFor = (tc: TestCaseSummary): RowAction[] => [
    { label: 'Edit', icon: Pencil, onSelect: () => void openEdit(tc) },
    { label: 'Download', icon: Download, onSelect: () => void download(tc) },
    { label: 'Delete…', icon: Trash2, destructive: true, onSelect: () => { deleteTarget.value = tc; deleteOpen.value = true } },
]

const confirmDelete = async () => {
    const target = deleteTarget.value
    if (!target) return
    deleting.value = true
    try {
        await testCaseService.remove(props.slug, target.id)
        triggerToast('Test case deleted', 'success')
        deleteOpen.value = false
        await load()
    } catch (e) {
        triggerToast(getErrorMessage(e, 'Could not delete the test case.'), 'error')
    } finally {
        deleting.value = false
    }
}

const onZipPick = (e: Event) => {
    zipFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
    if (zipFile.value) {
        zipName.value = zipFile.value.name
        zipOpen.value = true
    }
}

const clearZip = () => {
    zipFile.value = null
    zipOpen.value = false
    if (zipInput.value) zipInput.value.value = ''
}

const doImport = async () => {
    if (!zipFile.value) return
    importing.value = true
    try {
        const res = await testCaseService.importTestCases(props.slug, zipFile.value)
        const count = res.data.data?.length ?? 0
        triggerToast(`Imported ${count} test case${count === 1 ? '' : 's'}`, 'success')
        clearZip()
        await load()
    } catch (e) {
        triggerToast(getErrorMessage(e, 'Could not import test cases.'), 'error')
    } finally {
        importing.value = false
    }
}

// Reload when the host navigates to a different problem on the same instance.
watch(() => props.slug, () => {
    clearZip()
    loaded.value = false
    load()
})

onMounted(load)
</script>
