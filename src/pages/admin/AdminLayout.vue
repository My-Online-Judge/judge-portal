<template>
    <div class="flex h-screen overflow-hidden bg-background text-foreground">
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
            <!-- Brand -->
            <div class="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
                <RouterLink
                    :to="ROUTE_PATH.ADMIN"
                    class="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    @click="sidebarOpen = false"
                >
                    <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Binary class="size-4" />
                    </span>
                    <span class="flex min-w-0 flex-col leading-tight">
                        <span class="text-[13px] font-semibold">Judge Admin</span>
                        <span class="font-mono text-[11px] text-muted-foreground">oj.console</span>
                    </span>
                </RouterLink>
                <button
                    type="button"
                    class="ml-auto rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:hidden"
                    aria-label="Close navigation"
                    @click="sidebarOpen = false"
                >
                    <X class="size-4" />
                </button>
            </div>

            <!-- Navigation -->
            <nav class="flex flex-1 flex-col gap-[18px] overflow-y-auto px-2.5 py-3.5">
                <div v-for="group in navGroups" :key="group.label">
                    <p class="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/50">
                        {{ group.label }}
                    </p>
                    <ul class="space-y-0.5">
                        <li v-for="item in group.items" :key="item.to">
                            <RouterLink
                                :to="item.to"
                                class="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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

            <!-- User chip (non-interactive for now) -->
            <div class="flex items-center gap-2.5 border-t border-sidebar-border p-3">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[12px] font-semibold text-foreground">
                    {{ initials }}
                </span>
                <div class="flex min-w-0 flex-1 flex-col leading-tight">
                    <span class="truncate text-[13px] font-medium text-foreground">{{ displayName }}</span>
                    <span class="truncate font-mono text-[11px] text-muted-foreground">{{ roleLabel }}</span>
                </div>
                <ChevronsUpDown class="size-4 shrink-0 text-muted-foreground" />
            </div>
        </aside>

        <!-- Content column -->
        <div class="flex min-w-0 flex-1 flex-col">
            <!-- Top header -->
            <header class="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
                <button
                    type="button"
                    class="-ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                    aria-label="Open navigation"
                    @click="sidebarOpen = true"
                >
                    <Menu class="size-5" />
                </button>

                <!-- Breadcrumb trail -->
                <nav class="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                    <template v-for="(crumb, i) in crumbs" :key="i">
                        <ChevronRight v-if="i > 0" class="size-4 shrink-0 text-muted-foreground/60" />
                        <RouterLink
                            v-if="crumb.to && i < crumbs.length - 1"
                            :to="crumb.to"
                            class="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            :class="{ 'font-mono': crumb.mono }"
                        >
                            {{ crumb.label }}
                        </RouterLink>
                        <span
                            v-else
                            class="truncate text-foreground"
                            :class="[i === crumbs.length - 1 ? 'font-medium' : 'shrink-0 text-muted-foreground', { 'font-mono': crumb.mono }]"
                        >
                            {{ crumb.label }}
                        </span>
                    </template>
                </nav>

                <div class="flex-1"></div>

                <!-- Search affordance (visual placeholder) -->
                <div
                    class="hidden h-[34px] w-[220px] items-center gap-2 rounded-md border border-input bg-background px-2.5 text-muted-foreground sm:flex"
                    aria-hidden="true"
                >
                    <Search class="size-4 shrink-0" />
                    <span class="flex-1 text-[13px]">Search…</span>
                    <kbd class="rounded border border-border px-1 font-mono text-[11px] leading-4">⌘K</kbd>
                </div>

                <!-- Theme toggle (functional) -->
                <button
                    type="button"
                    class="flex size-[34px] shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
                    @click="toggleTheme"
                >
                    <Sun v-if="isDark" class="size-4" />
                    <Moon v-else class="size-4" />
                </button>

                <!-- Notifications (decorative) -->
                <button
                    type="button"
                    class="relative flex size-[34px] shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Notifications"
                >
                    <Bell class="size-4" />
                    <span class="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-err" />
                </button>
            </header>

            <!-- Routed content — full-width; pages own their own max-width -->
            <main class="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
                <RouterView />
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { RouterLink, RouterView, useRoute, type RouteLocationRaw } from 'vue-router'
import {
    Binary,
    LayoutDashboard,
    ListChecks,
    Server,
    ShieldCheck,
    Users,
    Menu,
    X,
    ChevronRight,
    ChevronsUpDown,
    Search,
    Moon,
    Sun,
    Bell,
} from 'lucide-vue-next'
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
                    icon: ListChecks,
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

// Breadcrumb trail keyed by route name. To add a page, add one entry below.
// The root "Admin" crumb always links back to the dashboard.
interface Crumb {
    label: string
    to?: RouteLocationRaw
    mono?: boolean
}

const adminCrumb: Crumb = { label: 'Admin', to: { name: 'AdminDashboard' } }
const problemsCrumb: Crumb = { label: 'Problems', to: { name: 'AdminProblems' } }

const crumbs = computed<Crumb[]>(() => {
    switch (String(route.name ?? '')) {
        case 'AdminDashboard':
            return [adminCrumb, { label: 'Dashboard' }]
        case 'AdminProblems':
            return [adminCrumb, { label: 'Problems' }]
        case 'AdminProblemCreate':
            return [adminCrumb, problemsCrumb, { label: 'New' }]
        case 'AdminProblemDetail':
            return [adminCrumb, problemsCrumb, { label: String(route.params.slug ?? ''), mono: true }]
        case 'AdminJudgeServers':
            return [adminCrumb, { label: 'Judge servers' }]
        case 'AdminRoles':
            return [adminCrumb, { label: 'Roles' }]
        case 'AdminUsers':
            return [adminCrumb, { label: 'Users' }]
        default:
            return [adminCrumb]
    }
})

const displayName = computed(() => user.value?.name || user.value?.username || 'Admin')

const roleLabel = computed(() => {
    const name = user.value?.roles?.[0]?.name
    return `role:${name ? name.toLowerCase() : 'user'}`
})

const initials = computed(() => {
    const source = (user.value?.name || user.value?.username || '?').trim()
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
    return source.slice(0, 2).toUpperCase()
})

// Theme toggle — dark class on <html> + localStorage persistence.
const isDark = ref(false)

const applyTheme = (dark: boolean) => {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
}

const toggleTheme = () => {
    const next = !isDark.value
    applyTheme(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
}

onMounted(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') {
        applyTheme(stored === 'dark')
    } else {
        isDark.value = document.documentElement.classList.contains('dark')
    }
})
</script>
