<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { CircleDot, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = withDefaults(
    defineProps<{
        dirty: boolean
        summary?: string
        saving?: boolean
    }>(),
    { summary: undefined, saving: false },
)

const emit = defineEmits<{ save: []; discard: [] }>()

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '')
const shortcut = isMac ? '⌘ S' : 'Ctrl S'

// Ctrl/Cmd+S saves while there is something to save, instead of the browser's "Save page" dialog.
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (!props.dirty) return
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
    if (e.key.toLowerCase() !== 's') return
    e.preventDefault()
    if (!props.saving) emit('save')
})
</script>

<template>
    <Transition name="unsaved">
        <div
            v-if="dirty"
            role="region"
            aria-label="Unsaved changes"
            class="sticky bottom-4 z-20 mx-auto flex w-full max-w-[620px] flex-wrap items-center gap-2.5 rounded-xl border border-border bg-popover py-2 pr-2 pl-3.5 text-[13px] text-popover-foreground shadow-[var(--shadow-lg)]"
        >
            <CircleDot class="size-4 shrink-0 text-warning" aria-hidden="true" />
            <span class="min-w-0 flex-1">
                <b class="font-semibold">Unsaved changes</b>
                <span v-if="summary" class="text-muted-foreground"> {{ summary }}</span>
            </span>
            <Button variant="ghost" size="sm" :disabled="saving" @click="emit('discard')">Discard</Button>
            <Button size="sm" :disabled="saving" :aria-busy="saving ? 'true' : undefined" @click="emit('save')">
                <Loader2 v-if="saving" class="size-4 animate-spin" aria-hidden="true" />
                Save changes
                <kbd class="rounded-[4px] bg-[color-mix(in_oklch,currentColor_14%,transparent)] px-[5px] py-px font-mono text-[11px] opacity-75">{{ shortcut }}</kbd>
            </Button>
        </div>
    </Transition>
</template>

<style scoped>
.unsaved-enter-active,
.unsaved-leave-active {
    transition: opacity 160ms ease-out, transform 160ms ease-out;
}
.unsaved-enter-from,
.unsaved-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
    .unsaved-enter-active,
    .unsaved-leave-active {
        transition: none;
    }
}
</style>
