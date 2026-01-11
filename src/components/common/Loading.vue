<template>
    <div class="flex flex-col items-center justify-center p-8 text-slate-500 w-full">
        <!-- Spinner Variant -->
        <template v-if="variant === 'spinner'">
            <Loader2 class="h-10 w-10 animate-spin text-blue-600 mb-3" />
        </template>

        <!-- Progress Bar Variant -->
        <template v-else-if="variant === 'progress'">
            <div class="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3 relative">
                <div class="absolute top-0 left-0 h-full bg-blue-600 rounded-full animate-indeterminate w-full origin-left"></div>
            </div>
        </template>

        <span v-if="text" class="text-sm font-medium animate-pulse">{{ text }}</span>
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
</style>
