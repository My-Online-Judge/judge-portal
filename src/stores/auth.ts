import { defineStore } from 'pinia'
import { ref } from 'vue'
import authService from '@/services/authService'
import type { UserResponse } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<UserResponse | null>(null)
    const isAuthenticated = ref(false)

    const login = (userData: UserResponse) => {
        user.value = userData
        isAuthenticated.value = true
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

        const cookies = ['accessToken', 'refreshToken']
        const paths = ['/']

        cookies.forEach(cookie => {
            paths.forEach(path => {
                document.cookie = `${cookie}=; Max-Age=0; path=${path}; SameSite=Lax; Secure`
                document.cookie = `${cookie}=; Max-Age=0; path=${path}; SameSite=Lax`
                document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
            })
        })

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
        }
    }

    return {
        user,
        isAuthenticated,
        login,
        logout,
        fetchUser
    }
})
