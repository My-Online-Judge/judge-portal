import { ref } from 'vue'
import { isAxiosError } from 'axios'

/** A delete that finds the row already gone (404) has done its job. */
export const isAlreadyGone = (err: unknown): boolean => isAxiosError(err) && err.response?.status === 404

/** Keys (slugs) deleted optimistically and still waiting out their undo window or request. */
export function usePendingDeletes() {
    const keys = ref(new Set<string>())
    return {
        has: (key: string) => keys.value.has(key),
        /** False when the key was already pending, so a repeat delete does nothing. */
        add(key: string): boolean {
            if (keys.value.has(key)) return false
            keys.value = new Set(keys.value).add(key)
            return true
        },
        remove(key: string) {
            const next = new Set(keys.value)
            next.delete(key)
            keys.value = next
        },
        filter<T>(rows: T[], keyOf: (row: T) => string): T[] {
            return keys.value.size === 0 ? rows : rows.filter((r) => !keys.value.has(keyOf(r)))
        },
    }
}
