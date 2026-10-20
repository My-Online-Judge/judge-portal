<template>
    <template v-if="loading && !hasData">
        <slot name="skeleton">
            <div class="flex flex-col" aria-busy="true">
                <div v-for="n in rows" :key="n" class="flex h-12 items-center gap-4 border-b border-border px-[18px] last:border-b-0">
                    <span class="sk w-full" />
                </div>
            </div>
        </slot>
    </template>

    <template v-else-if="error && !hasData">
        <slot name="error" :retry="retry">
            <div class="p-[18px]">
                <div class="flex min-h-60 flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
                    <span class="grid size-10 place-items-center rounded-xl bg-destructive-soft text-destructive-ink">
                        <CloudOff class="size-5" />
                    </span>
                    <h4 class="text-sm font-semibold text-foreground">Couldn't load this list</h4>
                    <p class="max-w-xs text-sm text-muted-foreground">{{ error }}</p>
                    <Button variant="secondary" size="sm" @click="retry">
                        <RotateCw class="size-4" />
                        Retry
                    </Button>
                </div>
            </div>
        </slot>
    </template>

    <template v-else-if="hasData && empty">
        <slot name="empty">
            <div class="p-[18px]">
                <div class="flex min-h-60 flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
                    <template v-if="filtered">
                        <span class="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                            <SearchX class="size-5" />
                        </span>
                        <h4 class="text-sm font-semibold text-foreground">
                            <template v-if="filterSummary">No results match <span class="font-mono">{{ filterSummary }}</span></template>
                            <template v-else>No results match your filters</template>
                        </h4>
                        <p class="max-w-xs text-sm text-muted-foreground">Try a different word, or remove a filter.</p>
                        <Button variant="secondary" size="sm" @click="emit('clear-filters')">Clear filters</Button>
                    </template>
                    <template v-else>
                        <span class="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                            <ListChecks class="size-5" />
                        </span>
                        <h4 class="text-sm font-semibold text-foreground">{{ emptyTitle ?? 'Nothing here yet' }}</h4>
                        <p v-if="emptyHint" class="max-w-xs text-sm text-muted-foreground">{{ emptyHint }}</p>
                        <slot name="empty-action" />
                    </template>
                </div>
            </div>
        </slot>
    </template>

    <div v-else class="relative">
        <div
            v-if="error && hasData"
            role="alert"
            class="flex items-center justify-between gap-3 border-b border-border bg-destructive-soft px-[18px] py-2 text-sm text-destructive-ink"
        >
            <span class="flex items-center gap-2">
                <TriangleAlert class="size-4" />
                Couldn't refresh. Showing the last results.
            </span>
            <Button variant="secondary" size="sm" @click="retry">
                <RotateCw class="size-4" />
                Retry
            </Button>
        </div>
        <div v-if="loading" class="ls-bar" role="progressbar" aria-label="Refreshing" />
        <div :aria-busy="loading" class="ls-content" :class="{ 'ls-refetching': loading }">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { CloudOff, ListChecks, RotateCw, SearchX, TriangleAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

withDefaults(
    defineProps<{
        loading: boolean
        error?: string | null
        hasData: boolean
        empty: boolean
        rows?: number
        emptyTitle?: string
        emptyHint?: string
        filtered?: boolean
        filterSummary?: string
    }>(),
    { rows: 10 },
)

const emit = defineEmits<{ (e: 'retry'): void; (e: 'clear-filters'): void }>()

const retry = () => emit('retry')
</script>

<style scoped>
.ls-bar {
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    overflow: hidden;
    z-index: 3;
}
.ls-bar::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 30%;
    background: var(--primary);
    animation: ls-indet 1.1s ease-in-out infinite;
}
@keyframes ls-indet {
    from { transform: translateX(-100%); }
    to { transform: translateX(333%); }
}
.ls-content {
    opacity: 1;
    transition: opacity 200ms;
}
.ls-content.ls-refetching {
    opacity: 0.62;
    transition: opacity 200ms 150ms;
}
@media (prefers-reduced-motion: reduce) {
    .ls-bar::after {
        animation: none;
        width: 100%;
        opacity: 0.5;
    }
    .ls-content,
    .ls-content.ls-refetching {
        transition: none;
    }
}
</style>
