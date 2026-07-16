<template>
    <div class="relative flex min-h-[640px] overflow-hidden rounded-xl border border-border bg-card">
        <!-- Mobile drawer backdrop -->
        <div
            v-if="sidebarOpen"
            class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden"
            aria-hidden="true"
            @click="sidebarOpen = false"
        />

        <!-- Sidebar: static column on md+, off-canvas drawer below md -->
        <aside
            class="fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out motion-reduce:transition-none md:static md:z-auto md:translate-x-0"
            :class="sidebarOpen ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full'"
        >
            <!-- Sidebar header / wordmark -->
            <div class="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
                <RouterLink :to="ROUTE_PATH.ADMIN" class="flex items-center gap-2" @click="sidebarOpen = false">
                    <span class="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <ShieldCheck class="size-4" />
                    </span>
                    <span class="text-sm font-semibold tracking-tight">Admin console</span>
                </RouterLink>
                <button
                    type="button"
                    class="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:hidden"
                    aria-label="Close navigation"
                    @click="sidebarOpen = false"
                >
                    <X class="size-4" />
                </button>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                <div v-for="group in navGroups" :key="group.label">
                    <p class="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                        {{ group.label }}
                    </p>
                    <ul class="space-y-0.5">
                        <li v-for="item in group.items" :key="item.to">
                            <RouterLink
                                :to="item.to"
                                class="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                                :active-class="item.exact ? '' : activeLinkClass"
                                :exact-active-class="activeLinkClass"
                                @click="sidebarOpen = false"
                            >
                                <component :is="item.icon" class="size-4 shrink-0" />
                                <span class="truncate">{{ item.label }}</span>
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </nav>
        </aside>

        <!-- Content column -->
        <div class="flex min-w-0 flex-1 flex-col">
            <!-- Top bar -->
            <header class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
                <div class="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        class="-ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                        aria-label="Open navigation"
                        @click="sidebarOpen = true"
                    >
                        <Menu class="size-5" />
                    </button>
                    <div class="min-w-0">
                        <p class="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
                        <h1 class="truncate text-lg font-semibold leading-tight tracking-tight text-foreground">
                            {{ pageTitle }}
                        </h1>
                    </div>
                </div>

                <!-- Current admin identity -->
                <div v-if="user" class="flex items-center gap-2.5">
                    <div class="hidden text-right sm:block">
                        <p class="text-sm font-medium leading-tight text-foreground">{{ user.name || user.username }}</p>
                        <p class="font-mono text-xs leading-tight text-muted-foreground">{{ user.email }}</p>
                    </div>
                    <Avatar class="size-9">
                        <AvatarImage v-if="user.avatar" :src="user.avatar" :alt="user.username" />
                        <AvatarFallback>{{ initials }}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            <!-- Routed content -->
            <main class="flex-1 overflow-x-hidden bg-background p-4 md:p-6">
                <RouterView />
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import {
    LayoutDashboard,
    FileCode2,
    Server,
    ShieldCheck,
    Users,
    Menu,
    X,
} from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'

const route = useRoute()
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const sidebarOpen = ref(false)

const activeLinkClass = 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'

const can = (...perms: string[]) => perms.some((p) => authStore.hasPermission(p))

interface NavItem {
    label: string
    to: string
    icon: Component
    show: boolean
    exact?: boolean
}

const navGroups = computed(() => {
    const groups: { label: string; items: NavItem[] }[] = [
        {
            label: 'Overview',
            items: [
                { label: 'Dashboard', to: ROUTE_PATH.ADMIN, icon: LayoutDashboard, show: true, exact: true },
            ],
        },
        {
            label: 'Content',
            items: [
                {
                    label: 'Problems',
                    to: ROUTE_PATH.ADMIN_PROBLEMS,
                    icon: FileCode2,
                    show: can('problem:create', 'problem:update', 'problem:delete'),
                },
            ],
        },
        {
            label: 'Infrastructure',
            items: [
                { label: 'Judge servers', to: ROUTE_PATH.ADMIN_JUDGE_SERVERS, icon: Server, show: can('judgeserver:read') },
            ],
        },
        {
            label: 'Access',
            items: [
                { label: 'Roles', to: ROUTE_PATH.ADMIN_ROLES, icon: ShieldCheck, show: can('role:read') },
                { label: 'Users', to: ROUTE_PATH.ADMIN_USERS, icon: Users, show: can('user:read') },
            ],
        },
    ]

    return groups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
        .filter((g) => g.items.length > 0)
})

const titleMap: Record<string, string> = {
    AdminDashboard: 'Dashboard',
    AdminProblems: 'Problems',
    AdminJudgeServers: 'Judge servers',
    AdminRoles: 'Roles',
    AdminUsers: 'Users',
}

const pageTitle = computed(() => titleMap[String(route.name ?? '')] ?? 'Dashboard')

const initials = computed(() => {
    const source = user.value?.name || user.value?.username || '?'
    return source.charAt(0).toUpperCase()
})
</script>
