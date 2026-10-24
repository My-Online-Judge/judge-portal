<template>
    <div class="flex w-full flex-col items-center justify-center p-8 text-muted-foreground">
        <!-- Spinner Variant -->
        <template v-if="variant === 'spinner'">
            <Loader2 class="mb-3 size-6 animate-spin text-primary" />
        </template>

        <!-- Progress Bar Variant -->
        <template v-else-if="variant === 'progress'">
            <div class="relative mb-3 h-1 w-64 overflow-hidden rounded-full bg-muted">
                <div class="animate-indeterminate absolute top-0 left-0 h-full w-full origin-left rounded-full bg-primary"></div>
            </div>
        </template>

        <span v-if="text" class="text-sm">{{ text }}</span>
    </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{
    text?: string
    variant?: 'spinner' | 'progress'
}>(), {
    text: 'Loading...',
    variant: 'spinner'
})
</script>

<style scoped>
@keyframes indeterminate {
    0% {
        transform: translateX(-100%) scaleX(0.2);
    }

    50% {
        transform: translateX(0%) scaleX(0.5);
    }

    100% {
        transform: translateX(100%) scaleX(0.2);
    }
}

.animate-indeterminate {
    animation: indeterminate 1.5s infinite linear;
}

@media (prefers-reduced-motion: reduce) {
    .animate-indeterminate {
        animation: none;
        transform: none;
        opacity: 0.5;
    }
}
</style>
