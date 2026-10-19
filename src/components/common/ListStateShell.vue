<template>
    <template v-if="loading && !hasData">
        <slot name="skeleton">
            <div class="space-y-2.5 p-[18px]">
                <div v-for="n in 6" :key="n" class="h-11 w-full rounded bg-muted animate-ojpulse" />
            </div>
        </slot>
    </template>

    <template v-else-if="error && !hasData">
        <slot name="error" :retry="retry">
            <div class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-12 text-center">
                    <TriangleAlert class="size-6 text-err" />
                    <p class="text-sm font-medium text-foreground">Couldn't load this list.</p>
                    <p class="max-w-xs text-xs text-muted-foreground">
                        The request failed. Check your connection and try again.
                    </p>
                    <Button variant="outline" size="sm" @click="retry">
                        <RefreshCw class="size-4" />
                        Retry
                    </Button>
                </div>
            </div>
        </slot>
    </template>

    <template v-else-if="hasData && empty">
        <slot name="empty">
            <div class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
                    <ListChecks class="size-6 text-muted-foreground" />
                    <p class="text-sm font-medium text-foreground">Nothing here yet.</p>
                </div>
            </div>
        </slot>
    </template>

    <div v-else>
        <div
            v-if="error && hasData"
            role="alert"
            class="flex items-center justify-between gap-3 border-b border-err/40 bg-err/5 px-[18px] py-2 text-sm text-foreground"
        >
            <span class="flex items-center gap-2">
                <TriangleAlert class="size-4 text-err" />
                Couldn't refresh this list.
            </span>
            <Button variant="outline" size="sm" @click="retry">
                <RefreshCw class="size-4" />
                Retry
            </Button>
        </div>
        <div :aria-busy="loading" :class="loading ? 'opacity-60 transition-opacity' : 'transition-opacity'">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ListChecks, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{
    loading: boolean
    error?: string | null
    hasData: boolean
    empty: boolean
}>()

const emit = defineEmits<{ (e: 'retry'): void }>()

const retry = () => emit('retry')
</script>
