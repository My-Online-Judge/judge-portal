<template>
    <div class="flex flex-col gap-6 p-6 border-b border-slate-100 lg:flex-row lg:items-center lg:justify-between">
        <!-- Title -->
        <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-blue-600">
                <List class="h-5 w-5" />
            </div>
            <h1 class="text-xl font-bold text-slate-800">Problem List</h1>
        </div>

        <!-- Filters -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <!-- Difficulty Dropdown -->
            <Select>
                <SelectTrigger class="w-[120px] border-slate-200">
                    <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
            </Select>

            <!-- Tags Switch -->
            <div class="flex items-center gap-2 rounded-md px-3 py-2 border border-slate-200 cursor-pointer">
                <Switch id="tags-mode" class="scale-90 data-[state=checked]:bg-blue-500" />
                <Label for="tags-mode" class="text-sm font-medium text-slate-600 cursor-pointer">Tags</Label>
            </div>

            <!-- Keyword Input -->
            <div class="relative w-full lg:w-[280px]">
                <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search by title or ID..." class="pl-9 border-slate-200" />
            </div>

            <!-- Refresh Button -->
            <Button size="icon" class="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                <RotateCw class="h-4 w-4" />
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, RotateCw, List } from 'lucide-vue-next'
</script>
