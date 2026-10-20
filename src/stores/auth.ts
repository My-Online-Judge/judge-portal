import { defineStore } from 'pinia'
import { ref } from 'vue'
import authService from '@/services/authService'
import type { UserResponse } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<UserResponse | null>(null)
    const isAuthenticated = ref(false)
    // Known to be signed out: /auth/me answered 401, or a logout ran. ensureLoaded then has its answer, so an anonymous
    // visitor's re-reads do not ask again. A network failure leaves it unknown, and the next call asks.
    let signedOut = false

    const login = (userData: UserResponse) => {
        user.value = userData
        isAuthenticated.value = true
        signedOut = false
    }

    const logout = async (options: { reload?: boolean, notifyServer?: boolean } = {}) => {
        const { reload = true, notifyServer = true } = options

        if (notifyServer) {
            try {
                await authService.logout()
            } catch (error) {
                console.error('Logout failed on server', error)
            }
        }

        user.value = null
        isAuthenticated.value = false
        signedOut = true

        // The auth cookies are HttpOnly — only the server can clear them, which
        // POST /auth/logout above does.

        if (reload) {
            window.location.href = '/'
        }
    }

    const fetchUser = async () => {
        try {
            const response = await authService.getMe()
            if (response.data && response.data.data) {
                login(response.data.data)
            }
        } catch (error) {
            console.error('Failed to fetch user', error)
            // If fetching user fails (e.g. 401), we just clear local state without calling server logout again
            await logout({ reload: false, notifyServer: false })
            // Only a 401 says "signed out"; after a network error or a 5xx the next ensureLoaded asks again.
            signedOut = (error as { response?: { status?: number } } | null)?.response?.status === 401
        }
    }

    const hasPermission = (permission: string): boolean => {
        return !!user.value?.permissions?.includes(permission)
    }

    let loadPromise: Promise<void> | null = null
    const ensureLoaded = (): Promise<void> => {
        if (user.value || signedOut) return Promise.resolve()
        if (!loadPromise) loadPromise = fetchUser().finally(() => { loadPromise = null })
        return loadPromise
    }

    return {
        user,
        isAuthenticated,
        login,
        logout,
        fetchUser,
        hasPermission,
        ensureLoaded
    }
})
