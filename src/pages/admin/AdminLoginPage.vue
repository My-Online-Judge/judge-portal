<template>
    <div class="flex min-h-screen items-start justify-center bg-background px-4 py-12 sm:items-center">
        <div class="flex w-full max-w-[400px] flex-col gap-4 rounded-xl border border-border bg-card p-[26px] shadow-[var(--shadow-md)]">
            <div class="flex items-center gap-2.5">
                <b class="font-display text-[15px]">MOJ</b>
                <Badge variant="neutral" class="h-5">Admin</Badge>
            </div>
            <div>
                <h1 class="text-[22px] leading-tight font-bold tracking-[-0.02em]">Sign in to the admin console</h1>
                <p class="mt-1 text-[13px] text-muted-foreground">
                    For teachers and admins.
                    <template v-if="returnLabel">Afterwards you'll return to <b class="font-semibold text-foreground">{{ returnLabel }}</b>.</template>
                </p>
            </div>

            <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
                <div class="flex flex-col gap-1.5">
                    <Label for="username">Username</Label>
                    <Input id="username" v-model="username" autocomplete="username" :disabled="loading" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <Label for="password">Password</Label>
                    <div class="relative">
                        <Input
                            id="password"
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="current-password"
                            class="pr-10"
                            :disabled="loading"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            class="absolute top-1/2 right-0.5 -translate-y-1/2 active:-translate-y-1/2"
                            :aria-label="showPassword ? 'Hide password' : 'Show password'"
                            :aria-pressed="showPassword"
                            @click="showPassword = !showPassword"
                        >
                            <EyeOff v-if="showPassword" />
                            <Eye v-else />
                        </Button>
                    </div>
                </div>

                <!-- One message per API error, above the button; the typed username stays -->
                <div
                    v-if="alert"
                    role="alert"
                    class="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] leading-normal"
                    :class="alertTone[alert.tone]"
                >
                    <component :is="alert.icon" class="mt-px size-4 shrink-0" aria-hidden="true" />
                    <span><b class="font-semibold">{{ alert.title }}</b> {{ alert.body }}</span>
                </div>

                <Button type="submit" size="lg" class="w-full" :disabled="loading || !username || !password" :aria-busy="loading ? 'true' : undefined">
                    <Loader2 v-if="loading" class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    {{ loading ? 'Signing in' : 'Sign in' }}
                </Button>
            </form>

            <RouterLink
                :to="ROUTE_PATH.PROBLEM"
                class="mx-auto inline-flex items-center gap-1.5 rounded-sm text-[13px] text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft class="size-3.5" aria-hidden="true" />
                Back to problems
            </RouterLink>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ArrowLeft, CircleAlert, Eye, EyeOff, Loader2, ShieldAlert, Timer } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
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
const showPassword = ref(false)
const loading = ref(false)

interface LoginAlert {
    tone: 'danger' | 'warn'
    icon: Component
    title: string
    body: string
}

const alertTone: Record<LoginAlert['tone'], string> = {
    danger: 'border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-destructive-soft text-destructive-ink',
    warn: 'border-[color-mix(in_oklch,var(--warning)_30%,transparent)] bg-warning-soft text-warning-ink',
}

// The API answers each sign-in failure with its own status: INVALID_CREDENTIALS is 401,
// RATE_LIMITED is 429 and ACCESS_BANNED is 403.
const ALERTS: Record<'invalid' | 'limited' | 'banned' | 'other', LoginAlert> = {
    invalid: {
        tone: 'danger',
        icon: CircleAlert,
        title: 'Username or password is incorrect.',
        body: 'Check both and try again.',
    },
    limited: {
        tone: 'warn',
        icon: Timer,
        title: 'Too many failed attempts.',
        body: 'Wait a few minutes, then try again.',
    },
    banned: {
        tone: 'danger',
        icon: ShieldAlert,
        title: 'Sign-in from this address or device is blocked.',
        body: 'Ask another admin to remove the ban.',
    },
    other: {
        tone: 'danger',
        icon: CircleAlert,
        title: "Couldn't sign in.",
        body: 'Check your connection and try again.',
    },
}

const alert = ref<LoginAlert | null>(null)

const alertFor = (e: unknown): LoginAlert => {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined
    if (status === 401 || status === 400) return ALERTS.invalid
    if (status === 429) return ALERTS.limited
    if (status === 403) return ALERTS.banned
    return ALERTS.other
}

const redirectTarget = computed(() => {
    const raw = route.query.redirect
    return typeof raw === 'string' && raw ? raw : ROUTE_PATH.ADMIN
})

// Names the page the redirect returns to, e.g. "Admin › Users".
const PAGE_NAMES: Record<string, string> = {
    AdminDashboard: 'Dashboard',
    AdminProblems: 'Problems',
    AdminProblemCreate: 'Problems',
    AdminProblemDetail: 'Problems',
    AdminJudgeServers: 'Judge servers',
    AdminRoles: 'Roles',
    AdminPermissions: 'Permissions',
    AdminUsers: 'Users',
    AdminSecurity: 'Security',
}
const returnLabel = computed(() => {
    if (typeof route.query.redirect !== 'string' || !route.query.redirect) return ''
    try {
        const name = PAGE_NAMES[String(router.resolve(redirectTarget.value).name ?? '')]
        return name ? `Admin › ${name}` : ''
    } catch {
        return ''
    }
})

const handleSubmit = async () => {
    if (loading.value) return
    alert.value = null
    loading.value = true
    try {
        await authService.login(username.value.trim(), password.value)
        await authStore.fetchUser()
        router.replace(redirectTarget.value)
    } catch (e: unknown) {
        alert.value = alertFor(e)
    } finally {
        loading.value = false
    }
}
</script>
