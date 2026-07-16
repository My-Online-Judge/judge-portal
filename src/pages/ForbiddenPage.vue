<template>
    <div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div class="flex size-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
            <ShieldAlert class="size-7" />
        </div>

        <p class="mt-6 font-mono text-sm font-medium tracking-wide text-muted-foreground">403</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-foreground">Access denied</h1>
        <p class="mt-2 max-w-md text-sm text-muted-foreground">
            You don't have permission to view this page. If you think this is a mistake, ask an administrator to
            update your access.
        </p>

        <RouterLink :to="ROUTE_PATH.PROBLEM" class="mt-6">
            <Button variant="default">
                <ArrowLeft class="size-4" />
                Back to problems
            </Button>
        </RouterLink>
    </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShieldAlert, ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ROUTE_PATH } from '@/constants/routePath'
</script>
