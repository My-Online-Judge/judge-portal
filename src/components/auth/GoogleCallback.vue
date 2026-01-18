<template>
    <div class="flex items-center justify-center min-h-screen">
        <Loading text="Processing Login..." />
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import authService from '@/services/authService'
import { useToast } from '@/composables/useToast'
import { ROUTE_PATH } from '@/constants/routePath'
import { useAuthStore } from '@/stores/auth'
import Loading from '@/components/common/Loading.vue'

const router = useRouter()
const route = useRoute()
const { triggerToast } = useToast()
const authStore = useAuthStore()

onMounted(async () => {
    const code = route.query.code as string

    if (!code) {
        triggerToast('Login failed: No authorization code received', 'error')
        router.push(ROUTE_PATH.PROBLEM)
        return
    }

    try {
        const response = await authService.authenticateGoogleUser(code)

        if (response.status !== 200) {
            triggerToast('Login failed', 'error')
            router.push(ROUTE_PATH.PROBLEM)
            return
        }

        if (response.data && response.data.data) {
            const { accessToken, refreshToken } = response.data.data
            const secure = window.location.protocol === 'https:' ? '; Secure' : ''
            const rfMaxAge = 7 * 24 * 60 * 60
            const atMaxAge = 15 * 60

            document.cookie = `accessToken=${accessToken}; path=/; max-age=${atMaxAge}; SameSite=Lax${secure}`
            document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${rfMaxAge}; SameSite=Lax${secure}`

            await authStore.fetchUser()

            triggerToast('Login successful', 'success')

            const redirectUrl = localStorage.getItem('loginRedirectUrl')

            if (redirectUrl) {
                localStorage.removeItem('loginRedirectUrl')
                window.location.href = redirectUrl
            } else {
                router.push(ROUTE_PATH.PROBLEM)
            }
        } else {
            throw new Error("Invalid response data")
        }
    } catch (error) {
        console.error('Google login error:', error)
        triggerToast('Login failed. Please try again.', 'error')
        router.push(ROUTE_PATH.PROBLEM)
    }
})
</script>
