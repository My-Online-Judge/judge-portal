<template>
    <header class="sticky top-0 z-50 border-b border-border bg-background">
        <div class="mx-auto flex h-16 max-w-[84rem] items-center gap-2.5 px-4 md:gap-10 md:px-6 lg:px-10">
            <!-- Below md the nav moves into a left sheet behind this button -->
            <MobileNav :items="navItems" />

            <RouterLink to="/problems" class="flex min-h-11 items-center rounded-sm" aria-label="My Online Judge, problems">
                <span class="font-display text-lg text-foreground">MOJ</span>
            </RouterLink>

            <nav aria-label="Main" class="hidden self-stretch md:flex md:gap-6">
                <RouterLink v-for="item in navItems" :key="item.to" :to="item.to"
                    class="relative flex items-center self-stretch rounded-sm px-1 text-sm font-medium text-ink-2 transition-colors motion-reduce:transition-none hover:text-foreground focus-visible:-outline-offset-2"
                    active-class="!text-foreground after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:bg-primary">
                    {{ item.label }}
                </RouterLink>
            </nav>

            <div class="ml-auto flex items-center gap-1.5">
                <template v-if="authStore.isAuthenticated && authStore.user">
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <button type="button" class="relative flex cursor-pointer items-center rounded-md p-1 hover:bg-muted data-[state=open]:bg-muted after:absolute after:inset-x-0 after:-inset-y-0.5"
                                :aria-label="`Account menu for ${authStore.user.name}`">
                                <Avatar class="size-8">
                                    <AvatarImage v-if="authStore.user.avatar" :src="authStore.user.avatar" :alt="authStore.user.username" />
                                    <AvatarFallback class="bg-primary-soft text-info-ink text-xs font-semibold">{{ initials }}</AvatarFallback>
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
                            <DropdownMenuItem as-child>
                                <!-- Keyed by id when the username is an email address (a Google account). -->
                                <RouterLink :to="profilePath(authStore.user)">
                                    <UserRound class="size-4" />
                                    Profile
                                </RouterLink>
                            </DropdownMenuItem>
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
                    <Button variant="outline" @click="openLogin">Log in</Button>
                </template>
            </div>
        </div>

        <LoginModal v-model:open="loginPrompt.open.value" @close="loginPrompt.open.value = false" />
    </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { ListChecks, ShieldCheck, KeyRound, LogOut, Trophy, UserRound } from 'lucide-vue-next'
import LoginModal from '@/components/auth/LoginModal.vue'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import ThemeMenu from '@/components/layout/ThemeMenu.vue'
import MobileNav from '@/components/layout/MobileNav.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'
import { profilePath } from '@/lib/publicName'
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

const ADMIN_ANY = [
    'problem:create',
    'problem:update',
    'problem:delete',
    'submission:read_any',
    'contest:create',
    'contest:update',
    'contest:delete',
    'judgeserver:read',
    'role:read',
    'user:read',
]
const isAdmin = computed(() => ADMIN_ANY.some((p) => authStore.hasPermission(p)))

// One array for the desktop nav and the mobile sheet.
const navItems = computed(() => [
    { to: ROUTE_PATH.PROBLEM as string, label: 'Problems', icon: ListChecks },
    { to: ROUTE_PATH.CONTESTS as string, label: 'Contests', icon: Trophy },
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

// Through the store's one load, so a page that waits for the session on a hard load shares this request.
onMounted(() => {
    void authStore.ensureLoaded()
})
</script>
