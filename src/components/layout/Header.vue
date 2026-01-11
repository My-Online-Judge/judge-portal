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
                <Button variant="ghost" class="text-slate-600 hover:text-slate-900 font-medium">
                    Login
                </Button>
                <Button class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 rounded-full shadow-sm shadow-blue-200">
                    Register
                </Button>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Home, Trophy, BarChart2, BarChart, Info, List } from 'lucide-vue-next'
</script>
