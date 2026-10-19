import { onBeforeUnmount, ref } from 'vue'
import { onBeforeRouteLeave, useRouter, type RouteLocationNormalized } from 'vue-router'

/**
 * Asks before a dirty form is abandoned. In-app navigation is blocked and a
 * confirm dialog is requested via `confirmOpen`; tab close / reload is covered
 * by a `beforeunload` listener.
 */
export function useDiscardGuard(isDirty: () => boolean) {
    const router = useRouter()
    const confirmOpen = ref(false)
    let pending: RouteLocationNormalized | null = null
    let bypass = false

    onBeforeRouteLeave((to) => {
        if (bypass || !isDirty()) return true
        pending = to
        confirmOpen.value = true
        return false
    })

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!isDirty()) return
        e.preventDefault()
        e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

    function confirmLeave() {
        const target = pending
        pending = null
        confirmOpen.value = false
        if (!target) return
        bypass = true
        Promise.resolve(router.push(target.fullPath)).finally(() => {
            bypass = false
        })
    }

    function cancelLeave() {
        pending = null
        confirmOpen.value = false
    }

    return { confirmOpen, confirmLeave, cancelLeave }
}
