<template>
    <div class="rounded-xl border border-border bg-card p-6">
        <h3 class="mb-4 text-sm font-semibold text-foreground">Announcements</h3>
        <div class="flex flex-col divide-y divide-border">
            <div v-for="(item, index) in items" :key="index"
                class="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                <span class="font-medium text-foreground">{{ item.title }}</span>
                <span class="text-xs text-muted-foreground">{{ item.date }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const items = [
    {
        title: 'Weekly Contest 356 registration open',
        date: '2 days ago'
    },
    {
        title: 'Server maintenance scheduled for Sunday',
        date: '5 days ago'
    }
]
</script>
