import { ref } from 'vue'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<ToastType>('success')
let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
    function triggerToast(message: string, type: ToastType = 'success', duration = 2000) {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }

        toastMessage.value = message
        toastType.value = type
        showToast.value = true

        timer = setTimeout(() => {
            showToast.value = false
            timer = null
        }, duration)
    }

    return {
        showToast,
        toastMessage,
        toastType,
        triggerToast
    }
}
