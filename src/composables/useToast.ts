import { ref } from 'vue'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
    id: number
    message: string
    type: ToastType
}

const toasts = ref<Toast[]>([])
let nextId = 0
const MAX_TOASTS = 3

export function useToast() {
    function triggerToast(message: string, type: ToastType = 'success', duration = 3000) {
        const id = nextId++
        const newToast: Toast = { id, message, type }

        toasts.value.push(newToast)

        if (toasts.value.length > MAX_TOASTS) {
            toasts.value.shift()
        }

        setTimeout(() => {
            removeToast(id)
        }, duration)
    }

    function removeToast(id: number) {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index !== -1) {
            toasts.value.splice(index, 1)
        }
    }

    return {
        toasts,
        triggerToast,
        removeToast
    }
}
