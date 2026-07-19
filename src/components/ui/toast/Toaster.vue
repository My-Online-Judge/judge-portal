<template>
    <div class="pointer-events-none fixed top-4 left-1/2 z-[100] flex w-full max-w-[420px] -translate-x-1/2 flex-col items-center gap-2.5 px-4">
        <TransitionGroup
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
            move-class="transition duration-200 ease-out"
        >
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-l-2 border-border bg-background/95 px-3.5 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
                :class="getConfig(toast.type).accent"
                role="status"
                aria-live="polite"
            >
                <span
                    class="flex size-6 shrink-0 items-center justify-center rounded-full"
                    :class="getConfig(toast.type).chip"
                >
                    <component :is="getConfig(toast.type).icon" class="size-3.5 text-white" :stroke-width="3" />
                </span>
                <span class="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{{ toast.message }}</span>
                <button
                    type="button"
                    class="shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Dismiss notification"
                    @click="removeToast(toast.id)"
                >
                    <X class="size-4" />
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'
import { CheckCircle2, Info, TriangleAlert, XCircle, X, type LucideIcon } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()

// Per-type look: a solid icon chip + a matching left accent border. The card
// surface itself uses theme tokens (bg-background / border-border / text-foreground)
// so the toast reads correctly in both light and dark themes.
const config: Record<ToastType, { icon: LucideIcon; chip: string; accent: string }> = {
    success: { icon: CheckCircle2, chip: 'bg-emerald-500', accent: 'border-l-emerald-500' },
    info: { icon: Info, chip: 'bg-blue-500', accent: 'border-l-blue-500' },
    warning: { icon: TriangleAlert, chip: 'bg-amber-500', accent: 'border-l-amber-500' },
    error: { icon: XCircle, chip: 'bg-rose-500', accent: 'border-l-rose-500' },
}

const getConfig = (type: ToastType) => config[type] || config.success
</script>
