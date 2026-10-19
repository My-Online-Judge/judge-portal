import { ref, type Ref } from 'vue'

export const SIDEBAR_KEY = 'admin.sidebar'

function read(): boolean {
    try {
        return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
        // storage blocked (private mode, policy): start expanded
        return false
    }
}

/** The admin sidebar's collapsed (56 px rail) state, remembered per browser as '1'/'0'. */
export function useSidebarCollapse(): { collapsed: Ref<boolean>; toggle(): void } {
    const collapsed = ref(read())

    function toggle() {
        collapsed.value = !collapsed.value
        try {
            localStorage.setItem(SIDEBAR_KEY, collapsed.value ? '1' : '0')
        } catch {
            // storage blocked: the choice still applies for this page view
        }
    }

    return { collapsed, toggle }
}
