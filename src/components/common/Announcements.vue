<template>
    <div class="rounded-xl border bg-white p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
            <div class="h-4 w-1 bg-blue-500 rounded-full"></div>
            <h3 class="text-lg font-bold text-slate-800">Announcements</h3>
        </div>
        <div class="flex flex-col gap-4">
            <div v-for="(item, index) in items" :key="index" class="flex gap-3">
                <div class="mt-1">
                    <Megaphone class="h-4 w-4 text-blue-500" />
                </div>
                <div>
                    <a href="#" class="block font-medium text-slate-800 hover:text-blue-600 hover:underline">
                        {{ item.title }}
                    </a>
                    <span class="text-xs text-slate-500">{{ item.date }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Megaphone } from 'lucide-vue-next'

const items = [
    {
        title: 'Weekly Contest 356 Registration Open',
        date: '2 days ago'
    },
    {
        title: 'Server Maintenance Scheduled for Sunday',
        date: '5 days ago'
    }
]
</script>
