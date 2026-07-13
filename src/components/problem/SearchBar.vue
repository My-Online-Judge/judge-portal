<template>
    <div class="flex flex-col gap-6 border-b border-border p-6 lg:flex-row lg:items-center lg:justify-between">
        <!-- Title -->
        <h1 class="font-display text-3xl text-foreground">Problems</h1>

        <!-- Filters -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <!-- Difficulty Dropdown -->
            <Select>
                <SelectTrigger class="w-[120px]">
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
            <div class="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <Switch id="tags-mode" class="scale-90 data-[state=checked]:bg-primary" />
                <Label for="tags-mode" class="cursor-pointer text-sm font-medium text-muted-foreground">Tags</Label>
            </div>

            <!-- Keyword Input -->
            <div class="relative w-full lg:w-[280px]">
                <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by title or ID…" class="pl-9" />
            </div>

            <!-- Refresh Button -->
            <Button variant="outline" size="icon" class="cursor-pointer">
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
import { Search, RotateCw } from 'lucide-vue-next'
</script>
