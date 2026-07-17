<template>
    <div class="flex min-h-screen items-center justify-center bg-background px-4">
        <Card class="w-full max-w-sm">
            <CardHeader class="space-y-1 text-center">
                <div class="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck class="h-6 w-6" />
                </div>
                <CardTitle class="text-xl">Admin sign in</CardTitle>
                <p class="text-sm text-muted-foreground">Administrator username and password.</p>
            </CardHeader>
            <CardContent>
                <form class="space-y-4" @submit.prevent="handleSubmit">
                    <div class="space-y-2">
                        <Label for="username">Username</Label>
                        <Input id="username" v-model="username" autocomplete="username" placeholder="admin"
                            :disabled="loading" />
                    </div>
                    <div class="space-y-2">
                        <Label for="password">Password</Label>
                        <Input id="password" v-model="password" type="password" autocomplete="current-password"
                            :disabled="loading" />
                    </div>
                    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
                    <Button type="submit" class="w-full cursor-pointer" :disabled="loading || !username || !password">
                        {{ loading ? 'Signing in…' : 'Sign in' }}
                    </Button>
                </form>
                <RouterLink :to="ROUTE_PATH.PROBLEM"
                    class="mt-4 block text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
                    ← Back to MyOJ
                </RouterLink>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ShieldCheck } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import authService from '@/services/authService'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
    error.value = ''
    loading.value = true
    try {
        await authService.login(username.value.trim(), password.value)
        await authStore.fetchUser()
        const redirect = (route.query.redirect as string) || ROUTE_PATH.ADMIN
        router.replace(redirect)
    } catch (e: unknown) {
        const resp = (e as { response?: { data?: { message?: string } } })?.response
        error.value = resp?.data?.message || 'Invalid username or password'
    } finally {
        loading.value = false
    }
}
</script>
