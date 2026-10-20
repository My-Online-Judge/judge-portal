import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

// "/" jumps to the target unless the user is already typing somewhere.
export function useSlashFocus(target: Ref<{ focus(): void } | null>) {
    useEventListener(window, 'keydown', (e: KeyboardEvent) => {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
        const el = e.target as HTMLElement | null
        if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
        if (!target.value) return
        e.preventDefault()
        target.value.focus()
    })
}
