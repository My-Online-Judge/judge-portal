<template>
    <TooltipProvider :delay-duration="300">
        <div class="flex h-screen overflow-hidden bg-background text-foreground">
            <!-- Drawer backdrop below 1024 px -->
            <div
                v-if="sidebarOpen"
                class="fixed inset-0 z-30 bg-black/40 lg:hidden"
                aria-hidden="true"
                @click="sidebarOpen = false"
            />

            <!-- Sidebar: a 232 px column (56 px rail when collapsed) from 1024 px up, a drawer below -->
            <aside
                class="fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col gap-3.5 overflow-hidden border-r border-border bg-card px-2.5 py-3 transition-transform duration-200 ease-out motion-reduce:transition-none lg:static lg:z-auto lg:translate-x-0"
                :class="[
                    rail ? 'w-14' : 'w-[232px]',
                    sidebarOpen ? 'translate-x-0 shadow-[var(--shadow-lg)] lg:shadow-none' : '-translate-x-full',
                ]"
            >
                <!-- Brand -->
                <div class="flex items-center gap-2 pt-1 pb-1.5" :class="rail ? 'justify-center' : 'px-2'">
                    <RouterLink
                        :to="ROUTE_PATH.ADMIN"
                        class="flex min-w-0 items-center gap-[9px] rounded-md text-[15px] font-bold tracking-[-0.03em] whitespace-nowrap text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="MOJ admin, dashboard"
                        @click="sidebarOpen = false"
                    >
                        <span class="strip" aria-hidden="true"><i class="ok" /><i class="ok" /><i class="ok" /><i class="ok" /><i class="p" /><i class="dim" /></span>
                        <template v-if="!rail">
                            <span>MOJ</span>
                            <Badge variant="neutral" class="h-5">Admin</Badge>
                        </template>
                    </RouterLink>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        class="ml-auto lg:hidden"
                        aria-label="Close navigation"
                        @click="sidebarOpen = false"
                    >
                        <X />
                    </Button>
                </div>

                <!-- Navigation -->
                <nav class="flex flex-1 flex-col gap-3.5 overflow-x-hidden overflow-y-auto" aria-label="Admin navigation">
                    <div v-for="group in navGroups" :key="group.label" class="flex flex-col gap-px">
                        <span v-if="!rail" class="px-2.5 pb-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
                            {{ group.label }}
                        </span>
                        <span v-else class="mx-1.5 mt-0.5 mb-1 h-px bg-border" aria-hidden="true" />
                        <ul class="flex flex-col gap-px" :aria-label="group.label">
                            <li v-for="item in group.items" :key="item.to">
                                <Tooltip :disabled="!rail">
                                    <TooltipTrigger as-child>
                                        <RouterLink
                                            :to="item.to"
                                            :class="linkClass(isCurrent(item))"
                                            :aria-current="isCurrent(item) ? 'page' : undefined"
                                            @click="sidebarOpen = false"
                                        >
                                            <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
                                            <span :class="rail ? 'sr-only' : 'truncate'">{{ item.label }}</span>
                                        </RouterLink>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">{{ item.label }}</TooltipContent>
                                </Tooltip>
                            </li>
                        </ul>
                    </div>
                </nav>

                <!-- Footer: back to the client, collapse (1024 px up only) -->
                <div class="mt-auto flex flex-col gap-px border-t border-border pt-2.5">
                    <Tooltip :disabled="!rail">
                        <TooltipTrigger as-child>
                            <RouterLink
                                :to="ROUTE_PATH.PROBLEM"
                                :class="linkClass(false)"
                            >
                                <ArrowLeft class="size-4 shrink-0" aria-hidden="true" />
                                <span :class="rail ? 'sr-only' : 'truncate'">Back to problems</span>
                            </RouterLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">Back to problems</TooltipContent>
                    </Tooltip>
                    <Tooltip :disabled="!rail">
                        <TooltipTrigger as-child>
                            <button
                                type="button"
                                :class="[linkClass(false), 'max-lg:hidden']"
                                :aria-expanded="!collapsed"
                                @click="toggle"
                            >
                                <PanelLeftOpen v-if="collapsed" class="size-4 shrink-0" aria-hidden="true" />
                                <PanelLeftClose v-else class="size-4 shrink-0" aria-hidden="true" />
                                <span :class="rail ? 'sr-only' : 'truncate'">{{ collapsed ? 'Expand sidebar' : 'Collapse' }}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Expand sidebar</TooltipContent>
                    </Tooltip>
                </div>
            </aside>

            <!-- Content column -->
            <div class="flex min-w-0 flex-1 flex-col">
                <!-- Top bar -->
                <header class="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-border bg-card px-4 sm:px-5">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        class="-ml-1 lg:hidden"
                        aria-label="Open navigation"
                        @click="sidebarOpen = true"
                    >
                        <Menu />
                    </Button>

                    <!-- Breadcrumb trail -->
                    <nav class="min-w-0" aria-label="Breadcrumb">
                        <ol class="flex min-w-0 items-center gap-1.5 text-[13px]">
                            <li v-for="(crumb, i) in crumbs" :key="i" class="flex min-w-0 items-center gap-1.5">
                                <ChevronRight v-if="i > 0" class="size-3.5 shrink-0 text-muted-foreground opacity-60" aria-hidden="true" />
                                <RouterLink
                                    v-if="crumb.to && i < crumbs.length - 1"
                                    :to="crumb.to"
                                    class="shrink-0 rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    :class="{ 'font-mono': crumb.mono }"
                                >
                                    {{ crumb.label }}
                                </RouterLink>
                                <span
                                    v-else
                                    class="truncate"
                                    :class="[i === crumbs.length - 1 ? 'font-medium text-foreground' : 'shrink-0 text-muted-foreground', { 'font-mono': crumb.mono }]"
                                    :aria-current="i === crumbs.length - 1 ? 'page' : undefined"
                                >
                                    {{ crumb.label }}
                                </span>
                            </li>
                        </ol>
                    </nav>

                    <div class="ml-auto flex items-center gap-1.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <button
                                    type="button"
                                    class="flex cursor-pointer items-center rounded-[10px] p-[3px] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-2 data-[state=open]:ring-ring"
                                    :aria-label="`Account menu for ${displayName}`"
                                >
                                    <Avatar class="size-8">
                                        <AvatarImage v-if="user?.avatar" :src="user.avatar" :alt="user.username" />
                                        <AvatarFallback class="bg-primary-soft text-xs font-semibold text-info-ink">{{ initials }}</AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent class="w-56" align="end">
                                <DropdownMenuLabel class="font-normal">
                                    <div class="flex flex-col gap-1">
                                        <p class="text-sm leading-none font-medium">{{ displayName }}</p>
                                        <p class="text-xs leading-none text-muted-foreground">{{ user?.email }}</p>
                                        <p class="font-mono text-[11px] leading-none text-muted-foreground">{{ roleLabel }}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ThemeMenu />
                                <DropdownMenuItem @click="authStore.logout()">
                                    <LogOut class="size-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <!-- Routed content: pages own their max-width; sticky bars pin to this scroller -->
                <main class="flex-1 overflow-x-hidden overflow-y-auto bg-background">
                    <div class="px-4 pt-[22px] pb-7 sm:px-6">
                        <RouterView />
                    </div>
                </main>
            </div>
        </div>
    </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { RouterLink, RouterView, useRoute, type RouteLocationRaw } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import {
    ArrowLeft,
    ChevronRight,
    FileCode,
    KeyRound,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Server,
    ShieldAlert,
    ShieldCheck,
    Trophy,
    Users,
    X,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSidebarCollapse } from '@/composables/useSidebarCollapse'
import ThemeMenu from '@/components/layout/ThemeMenu.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROUTE_PATH } from '@/constants/routePath'
import { cn } from '@/lib/utils'

const route = useRoute()
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const sidebarOpen = ref(false)
watch(() => route.fullPath, () => (sidebarOpen.value = false))

// The 56 px rail exists only beside the content (1024 px up); the drawer always shows labels.
const { collapsed, toggle } = useSidebarCollapse()
const isDesktop = useMediaQuery('(min-width: 1024px)')
const rail = computed(() => collapsed.value && isDesktop.value)

const itemClass =
    'flex h-[34px] w-full items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const idleClass = 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground'
const activeClass = 'bg-primary-soft font-semibold text-info-ink'
const linkClass = (active: boolean) => cn(itemClass, active ? activeClass : idleClass, rail.value && 'justify-center px-0')

const can = (...perms: string[]) => perms.some((p) => authStore.hasPermission(p))

interface NavItem {
    label: string
    to: string
    icon: Component
    show: boolean
    exact?: boolean
}

// The dashboard matches only itself; a section also owns its sub-pages (Problems owns /problems/new).
const isCurrent = (item: NavItem) =>
    item.exact ? route.path === item.to : route.path === item.to || route.path.startsWith(`${item.to}/`)

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
                {
                    label: 'Contests',
                    to: ROUTE_PATH.ADMIN_CONTESTS,
                    icon: Trophy,
                    show: can('contest:create', 'contest:update', 'contest:delete'),
                },
                {
                    label: 'Submissions',
                    to: ROUTE_PATH.ADMIN_SUBMISSIONS,
                    icon: FileCode,
                    show: can('submission:read_any'),
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
                { label: 'Permissions', to: ROUTE_PATH.ADMIN_PERMISSIONS, icon: KeyRound, show: can('permission:read') },
                { label: 'Users', to: ROUTE_PATH.ADMIN_USERS, icon: Users, show: can('user:read') },
                { label: 'Security', to: ROUTE_PATH.ADMIN_SECURITY, icon: ShieldAlert, show: can('ban:read') },
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
        case 'AdminContests':
            return [adminCrumb, { label: 'Contests' }]
        case 'AdminSubmissions':
            return [adminCrumb, { label: 'Submissions' }]
        case 'AdminJudgeServers':
            return [adminCrumb, { label: 'Judge servers' }]
        case 'AdminRoles':
            return [adminCrumb, { label: 'Roles' }]
        case 'AdminPermissions':
            return [adminCrumb, { label: 'Permissions' }]
        case 'AdminUsers':
            return [adminCrumb, { label: 'Users' }]
        case 'AdminSecurity':
            return [adminCrumb, { label: 'Security' }]
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
</script>
