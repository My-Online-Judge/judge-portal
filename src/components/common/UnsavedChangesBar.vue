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
    <div
        v-if="dirty"
        role="region"
        aria-label="Unsaved changes"
        class="unsaved-bar sticky bottom-0 z-20 flex w-full flex-wrap items-center gap-3 border-t border-border bg-popover px-4 py-3 text-sm text-popover-foreground"
    >
        <CircleDot class="size-4 shrink-0 text-warning-ink" aria-hidden="true" />
        <span class="min-w-0 flex-1 basis-40">
            <b class="font-semibold">Unsaved changes</b>
            <!-- The space is in the expression: a bare leading space in a template text node is trimmed away. -->
            <span v-if="summary" class="text-muted-foreground">{{ ' ' + summary }}</span>
        </span>
        <Button variant="ghost" size="sm" :disabled="saving" @click="emit('discard')">Discard</Button>
        <Button
            size="sm"
            :disabled="saving"
            :aria-busy="saving ? 'true' : undefined"
            aria-keyshortcuts="Control+S Meta+S"
            @click="emit('save')"
        >
            <Loader2 v-if="saving" class="size-4 animate-spin" aria-hidden="true" />
            Save changes
            <kbd aria-hidden="true" class="rounded-sm bg-[color-mix(in_oklch,currentColor_14%,transparent)] px-1.5 py-px font-mono text-xs opacity-75">{{ shortcut }}</kbd>
        </Button>
    </div>
</template>

<style scoped>
/* Visible by default; the entrance starts from a slight lift and fades in. The bar is removed (v-if) while clean,
   so nothing is left hidden in the layout. */
.unsaved-bar {
    transition: opacity 160ms ease-out, transform 160ms ease-out;
}
@starting-style {
    .unsaved-bar {
        opacity: 0;
        transform: translateY(8px);
    }
}
@media (prefers-reduced-motion: reduce) {
    .unsaved-bar {
        transition: none;
    }
}
</style>
