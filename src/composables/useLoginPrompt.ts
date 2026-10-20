import { ref, type Ref } from 'vue'

// Module singleton: the header's LoginModal reads it, so any caller can ask for the login dialog.
const open = ref(false)

export function useLoginPrompt(): { open: Ref<boolean>; request(): void } {
    return {
        open,
        request() {
            open.value = true
        },
    }
}
