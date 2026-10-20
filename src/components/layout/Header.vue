<template>
    <header class="sticky top-0 z-50 border-b border-border bg-card">
        <div class="mx-auto flex h-14 max-w-[84rem] items-center gap-5 px-4 md:px-6 lg:px-8">
            <RouterLink to="/problems" class="flex items-center gap-[9px] text-[15px] font-bold tracking-[-0.03em] text-foreground"
                aria-label="My Online Judge, problems">
                <span class="strip" aria-hidden="true"><i class="ok" /><i class="ok" /><i class="ok" /><i class="ok" /><i class="p" /><i class="dim" /></span>
                <span>MOJ</span>
            </RouterLink>

            <nav aria-label="Main" class="hidden self-stretch md:flex md:gap-1">
                <RouterLink v-for="item in navItems" :key="item.to" :to="item.to"
                    class="-mb-px flex items-center gap-[7px] border-b-2 border-transparent px-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    active-class="!border-primary !text-foreground">
                    <component :is="item.icon" class="size-[15px]" aria-hidden="true" />
                    {{ item.label }}
                </RouterLink>
            </nav>

            <div class="ml-auto flex items-center gap-1.5">
                <template v-if="authStore.isAuthenticated && authStore.user">
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <button type="button" class="flex cursor-pointer items-center rounded-[10px] p-[3px] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-2 data-[state=open]:ring-ring"
                                :aria-label="`Account menu for ${authStore.user.name}`">
                                <Avatar class="size-8">
                                    <AvatarImage v-if="authStore.user.avatar" :src="authStore.user.avatar" :alt="authStore.user.username" />
                                    <AvatarFallback class="bg-primary-soft text-xs font-semibold text-info-ink">{{ initials }}</AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-60" align="end">
                            <DropdownMenuLabel class="font-normal">
                                <div class="flex flex-col space-y-1">
                                    <p class="text-sm font-semibold leading-none">{{ authStore.user.name }}</p>
                                    <p class="text-xs leading-none text-muted-foreground">{{ authStore.user.email }}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem @click="router.push(ROUTE_PATH.ACCOUNT_PASSWORD)">
                                <KeyRound class="size-4" />
                                Change password
                            </DropdownMenuItem>
                            <ThemeMenu />
                            <DropdownMenuItem @click="handleLogout">
                                <LogOut class="size-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </template>
                <template v-else>
                    <Button size="sm" @click="openLogin">Log in</Button>
                </template>
            </div>
        </div>

        <LoginModal v-model:open="loginPrompt.open.value" @close="loginPrompt.open.value = false" />
    </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { ListChecks, ShieldCheck, KeyRound, LogOut } from 'lucide-vue-next'
import LoginModal from '@/components/auth/LoginModal.vue'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import ThemeMenu from '@/components/layout/ThemeMenu.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar'

const loginPrompt = useLoginPrompt()
const authStore = useAuthStore()
const router = useRouter()

const ADMIN_ANY = ['problem:create', 'problem:update', 'problem:delete', 'judgeserver:read', 'role:read', 'user:read']
const isAdmin = computed(() => ADMIN_ANY.some((p) => authStore.hasPermission(p)))

// One array so more sections (Contests, a mobile menu) can be added later.
const navItems = computed(() => [
    { to: '/problems', label: 'Problems', icon: ListChecks },
    ...(isAdmin.value ? [{ to: ROUTE_PATH.ADMIN as string, label: 'Admin', icon: ShieldCheck }] : []),
])

const initials = computed(() => {
    const u = authStore.user
    const source = (u?.name || u?.username || '').trim()
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length > 1) return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
    return source.slice(0, 2).toUpperCase()
})

const openLogin = () => {
    loginPrompt.request()
}

const handleLogout = () => {
    authStore.logout()
}

onMounted(() => {
    authStore.fetchUser()
})
</script>
