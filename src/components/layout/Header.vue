<template>
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div class="w-full mx-auto flex h-[72px] items-center justify-between px-4 md:px-6 lg:px-8">
            <!-- Logo & Navigation -->
            <div class="flex h-full items-center gap-12">
                <!-- Logo -->
                <RouterLink to="/" class="text-2xl font-bold text-blue-600">My OJ</RouterLink>

                <!-- Navigation Menu -->
                <nav class="hidden md:flex h-full items-center gap-8 text-[15px] font-medium text-slate-600">
                    <RouterLink to="/" class="group relative flex h-full items-center gap-2 hover:text-blue-600 transition-colors"
                        exact-active-class="text-blue-600 header-active">
                        <Home class="h-4 w-4" />
                        Home
                        <div class="absolute bottom-0 h-0.5 w-full bg-blue-600 hidden group-[.header-active]:block"></div>
                    </RouterLink>
                    <RouterLink to="/problems" class="group relative flex h-full items-center gap-2 hover:text-blue-600 transition-colors"
                        active-class="text-blue-600 header-active">
                        <List class="h-4 w-4" />
                        Problems
                        <div class="absolute bottom-0 h-0.5 w-full bg-blue-600 hidden group-[.header-active]:block"></div>
                    </RouterLink>
                    <a href="#" class="flex h-full items-center gap-2 hover:text-blue-600 transition-colors">
                        <Trophy class="h-4 w-4" />
                        Contests
                    </a>
                    <a href="#" class="flex h-full items-center gap-2 hover:text-blue-600 transition-colors">
                        <BarChart2 class="h-4 w-4" />
                        State
                    </a>
                    <a href="#" class="flex h-full items-center gap-2 hover:text-blue-600 transition-colors">
                        <BarChart class="h-4 w-4" />
                        Hand
                    </a>
                    <a href="#" class="flex h-full items-center gap-2 hover:text-blue-600 transition-colors">
                        <Info class="h-4 w-4" />
                        About
                    </a>
                </nav>
            </div>

            <!-- Auth Buttons -->
            <div class="flex items-center gap-4">
                <template v-if="authStore.isAuthenticated && authStore.user">
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button variant="ghost" class="relative h-8 w-8 rounded-full p-0">
                                <Avatar class="h-8 w-8">
                                    <AvatarImage v-if="authStore.user.avatar" :src="authStore.user.avatar" :alt="authStore.user.username" />
                                    <AvatarFallback>{{ authStore.user.username.charAt(0).toUpperCase() }}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-56" align="end">
                            <DropdownMenuLabel class="font-normal">
                                <div class="flex flex-col space-y-1">
                                    <p class="text-sm font-medium leading-none">{{ authStore.user.name }}</p>
                                    <p class="text-xs leading-none text-muted-foreground">{{ authStore.user.email }}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="handleLogout">
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </template>
                <template v-else>
                    <Button variant="ghost" class="text-slate-600 hover:text-slate-900 font-medium" @click="openLogin">
                        Login
                    </Button>
                </template>
            </div>
        </div>

        <LoginModal v-model:open="isLoginOpen" @close="isLoginOpen = false" />
    </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Home, Trophy, BarChart2, BarChart, Info, List, User } from 'lucide-vue-next'
import LoginModal from '@/components/auth/LoginModal.vue'
import { useAuthStore } from '@/stores/auth'
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

const isLoginOpen = ref(false)
const authStore = useAuthStore()

const openLogin = () => {
    isLoginOpen.value = true
}

const handleLogout = () => {
    authStore.logout()
}

onMounted(() => {
    authStore.fetchUser()
})
</script>
