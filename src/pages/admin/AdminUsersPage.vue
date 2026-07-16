<template>
    <Card>
        <CardHeader class="space-y-1">
            <CardTitle class="text-base">Users</CardTitle>
            <CardDescription>Manage user accounts and their assigned roles.</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
                <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users class="size-5" />
                </span>
                <p class="text-sm font-medium text-foreground">This section is coming up.</p>
                <p class="max-w-sm text-xs text-muted-foreground">
                    User management lands in a later phase. You'll review accounts and assign roles here.
                </p>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
</script>
