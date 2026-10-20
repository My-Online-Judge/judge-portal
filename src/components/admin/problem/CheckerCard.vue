<template>
    <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="checker-title">
        <div class="flex flex-wrap items-center gap-2.5 border-b border-border px-3.5 py-3">
            <h3 id="checker-title" class="text-sm font-semibold text-foreground">Checker</h3>
            <span class="text-xs text-muted-foreground" aria-live="polite">{{ status }}</span>
            <div class="ml-auto flex flex-wrap items-center gap-2">
                <Button v-if="info?.spj" size="sm" variant="secondary" :disabled="busy" @click="openSource">
                    <Eye class="size-4" />
                    View source
                </Button>
                <Button v-if="loaded" size="sm" variant="secondary" :disabled="busy" @click="fileInput?.click()">
                    <Loader2 v-if="uploading" class="size-4 animate-spin motion-reduce:animate-none" />
                    <Upload v-else class="size-4" />
                    {{ info?.spj ? 'Replace checker' : 'Upload checker' }}
                </Button>
                <Button v-if="info?.spj" size="sm" variant="secondary" :disabled="busy" @click="removeOpen = true">
                    <Trash2 class="size-4" />
                    Remove…
                </Button>
                <input
                    ref="fileInput"
                    type="file"
                    accept=".cpp,.cc,.cxx"
                    class="sr-only"
                    tabindex="-1"
                    aria-label="Choose a checker source"
                    @change="onPick"
                >
            </div>
        </div>

        <p v-if="fileError" role="alert" class="border-b border-border bg-destructive-soft px-3.5 py-2.5 text-[13px] text-destructive-ink">
            {{ fileError }}
        </p>
        <div v-if="loadError" role="alert" class="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5 text-[13px] text-muted-foreground">
            The request failed. Check your connection and try again.
            <Button size="sm" variant="secondary" @click="load">Retry</Button>
        </div>

        <div class="flex flex-col gap-2.5 px-3.5 py-3 text-[13px] text-muted-foreground">
            <p>
                The checker runs as <code class="font-mono text-foreground">{{ COMMAND }}</code> and exits 0 for Accepted,
                1 for Wrong Answer, anything else for System Error. The expected output is not passed.
            </p>
            <pre class="overflow-x-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-xs text-foreground">{{ EXAMPLE }}</pre>
            <p>A checker that does not compile makes every submission a System Error until it is fixed.</p>
        </div>

        <Dialog v-model:open="sourceOpen">
            <DialogContent class="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Checker source</DialogTitle>
                    <DialogDescription>
                        Version {{ info?.version?.slice(0, VERSION_CHARS) }}
                    </DialogDescription>
                </DialogHeader>
                <div class="overflow-hidden rounded-lg border border-border">
                    <CodeEditor
                        :model-value="info?.source ?? ''"
                        language="cpp"
                        :theme="isDark ? 'vs-dark' : 'vs'"
                        :options="{ readOnly: true, minimap: { enabled: false } }"
                        height="360px"
                    />
                </div>
                <p v-if="info && info.source === null" class="text-[13px] text-muted-foreground">
                    The source is not stored. Upload the checker again.
                </p>
            </DialogContent>
        </Dialog>

        <ConfirmDialog
            :open="removeOpen"
            title="Remove the checker?"
            description="Outputs are compared exactly again. Past submissions keep their verdicts."
            confirm-label="Remove checker"
            tone="destructive"
            :busy="removing"
            @update:open="(v) => (removeOpen = v)"
            @confirm="confirmRemove"
        />
    </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { Eye, Loader2, Trash2, Upload } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EditorPlaceholder from '@/components/common/EditorPlaceholder.vue'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import problemService from '@/services/problemService'
import type { CheckerInfo } from '@/types/problem'

// Loaded on demand, like the submission dialog's: admin code stays out of the /problems closure (size:check).
const CodeEditor = defineAsyncComponent({
    loader: () => import('@/components/common/CodeEditor.vue'),
    loadingComponent: EditorPlaceholder,
    errorComponent: EditorPlaceholder,
    delay: 0,
})

const MAX_BYTES = 65_536
const VERSION_CHARS = 12
const COMMAND = 'spj <input_file> <user_output_file>'
const EXAMPLE = `#include <bits/stdc++.h>
int main(int argc, char** argv) {
    std::ifstream in(argv[1]), out(argv[2]);
    int n; in >> n;
    std::vector<long long> a(n), b;
    for (auto& x : a) in >> x;
    for (long long x; out >> x;) b.push_back(x);
    std::sort(a.begin(), a.end()); std::sort(b.begin(), b.end());
    return a == b ? 0 : 1;  // 0 = AC, 1 = WA, anything else = system error
}`

const props = defineProps<{ slug: string }>()

const { isDark } = useTheme()
const { success, error: errorToast } = useToast()

const info = ref<CheckerInfo | null>(null)
const loaded = ref(false)
const loadError = ref(false)
const uploading = ref(false)
const removing = ref(false)
const busy = computed(() => uploading.value || removing.value)
const fileError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const sourceOpen = ref(false)
const removeOpen = ref(false)

const status = computed(() => {
    if (!loaded.value) return loadError.value ? '' : 'Loading'
    return info.value?.spj
        ? `Checker active, version ${info.value.version?.slice(0, VERSION_CHARS) ?? ''}`
        : 'No checker. Outputs are compared exactly.'
})

const load = async () => {
    loadError.value = false
    try {
        const res = await problemService.getChecker(props.slug)
        info.value = res.data.data ?? { spj: false, version: null, source: null }
        loaded.value = true
    } catch {
        loadError.value = true
    }
}

const openSource = () => {
    sourceOpen.value = true
}

const onPick = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    fileError.value = ''
    if (!/\.(cpp|cc|cxx)$/i.test(file.name)) {
        fileError.value = 'A checker is a .cpp, .cc or .cxx file'
        return
    }
    if (file.size > MAX_BYTES) {
        fileError.value = 'A checker is at most 64 KiB'
        return
    }
    uploading.value = true
    try {
        await problemService.uploadChecker(props.slug, file)
        success('Checker uploaded', { description: 'Every submission is judged by it from now on.' })
        await load()
    } catch (err) {
        errorToast("Couldn't upload the checker", { description: getErrorMessage(err, 'The request failed. Try again.') })
    } finally {
        uploading.value = false
    }
}

const confirmRemove = async () => {
    removing.value = true
    try {
        await problemService.removeChecker(props.slug)
        removeOpen.value = false
        success('Checker removed', { description: 'Outputs are compared exactly again.' })
        await load()
    } catch (err) {
        errorToast("Couldn't remove the checker", { description: getErrorMessage(err, 'The request failed. Try again.') })
    } finally {
        removing.value = false
    }
}

onMounted(load)
</script>
