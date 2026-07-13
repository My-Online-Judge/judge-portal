<template>
    <header class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div class="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-4 md:px-6 lg:px-8">
            <!-- Wordmark + navigation -->
            <div class="flex h-full items-center gap-10">
                <RouterLink to="/" class="text-xl font-bold tracking-tight text-foreground">
                    My<span class="text-primary">OJ</span>
                </RouterLink>

                <nav class="hidden h-full items-center gap-7 text-sm text-muted-foreground md:flex">
                    <RouterLink to="/"
                        class="flex h-full items-center gap-2 -mb-px border-b-2 border-transparent transition-colors hover:text-foreground"
                        exact-active-class="!text-primary !border-primary">
                        <Home class="h-4 w-4" />
                        Home
                    </RouterLink>
                    <RouterLink to="/problems"
                        class="flex h-full items-center gap-2 -mb-px border-b-2 border-transparent transition-colors hover:text-foreground"
                        active-class="!text-primary !border-primary">
                        <List class="h-4 w-4" />
                        Problems
                    </RouterLink>
                    <a href="#"
                        class="flex h-full items-center gap-2 -mb-px border-b-2 border-transparent transition-colors hover:text-foreground">
                        <Trophy class="h-4 w-4" />
                        Contests
                    </a>
                </nav>
            </div>

            <!-- Auth -->
            <div class="flex items-center gap-3">
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
                    <Button variant="ghost" class="font-medium text-muted-foreground hover:text-foreground" @click="openLogin">
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
import { Home, List, Trophy } from 'lucide-vue-next'
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
