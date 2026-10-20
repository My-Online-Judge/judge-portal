<template>
    <div class="flex h-full min-h-0 flex-col bg-card" @keydown="onKeydown">
        <!-- Ctrl/Cmd+Enter anywhere in the pane submits. Inside the editor Monaco handles the keys itself
             (ProblemSubmit registers the same shortcut there) and stops them before they get here. -->
        <div class="min-h-0 flex-1">
            <ProblemSubmit ref="submitRef" :languages="languages || undefined" :problem-slug="slug"
                :submit-bar-to="submitBarTo" :contest-slug="contestSlug" :disabled-reason="disabledReason"
                @success="onSubmit" @contest-not-running="emit('contest-not-running')" />
        </div>
        <VerdictConsole :submission="latest" @judged="(s) => emit('judged', s)" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import ProblemSubmit from './ProblemSubmit.vue'
import VerdictConsole from './VerdictConsole.vue'
import { useLanguageStore } from '@/stores/language'
import type { Submission } from '@/types/submission'

defineProps<{
    slug: string
    // Passed on to ProblemSubmit: where to render the submit bar instead of below the editor.
    submitBarTo?: string
    // Passed on to ProblemSubmit: the running contest submissions count for, and why submitting is off.
    contestSlug?: string
    disabledReason?: string
}>()
const emit = defineEmits<{
    (e: 'success', submission: Submission): void
    (e: 'judged', submission: Submission): void
    (e: 'contest-not-running'): void
}>()

// This pane owns language loading: it fetches on mount. The store caches, so the call is idempotent.
const languageStore = useLanguageStore()
const { languages } = storeToRefs(languageStore)
onMounted(() => languageStore.fetchLanguages())

const submitRef = ref<InstanceType<typeof ProblemSubmit> | null>(null)
const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.defaultPrevented || e.isComposing) return
    e.preventDefault()
    submitRef.value?.submit()
}

// Latest submission drives the verdict console; also bubbled up so the
// Submissions tab can show it as a live pending row.
const latest = ref<Submission | null>(null)
const onSubmit = (submission: Submission) => {
    latest.value = submission
    emit('success', submission)
}
</script>
