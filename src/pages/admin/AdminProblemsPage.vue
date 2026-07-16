<template>
    <Card>
        <CardHeader class="space-y-1">
            <CardTitle class="text-base">Problems</CardTitle>
            <CardDescription>Create, edit and organise the problem catalog.</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
                <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FileCode2 class="size-5" />
                </span>
                <p class="text-sm font-medium text-foreground">This section is coming up.</p>
                <p class="max-w-sm text-xs text-muted-foreground">
                    Problem management lands in the next phase. You'll be able to create and edit problems here.
                </p>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { FileCode2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
</script>
