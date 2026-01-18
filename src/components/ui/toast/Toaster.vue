<template>
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full pointer-events-none">
        <TransitionGroup enter-active-class="transition ease-out duration-300" enter-from-class="transform opacity-0 -translate-y-2"
            enter-to-class="transform opacity-100 translate-y-0" leave-active-class="transition ease-in duration-200"
            leave-from-class="transform opacity-100 translate-y-0" leave-to-class="transform opacity-0 -translate-y-2">
            <div v-for="toast in toasts" :key="toast.id"
                class="bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-100 flex items-center gap-2 pointer-events-auto min-w-[300px]">
                <div :class="getConfig(toast.type).colorClass" class="rounded-full p-0.5 flex items-center justify-center">
                    <component :is="getConfig(toast.type).icon" class="h-3 w-3 text-white" />
                </div>
                <span class="text-slate-700 font-medium text-sm">{{ toast.message }}</span>
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'
import { Check, Info, AlertTriangle, XCircle, type LucideIcon } from 'lucide-vue-next'

const { toasts } = useToast()

const config: Record<ToastType, { icon: LucideIcon; colorClass: string }> = {
    success: { icon: Check, colorClass: 'bg-emerald-500' },
    info: { icon: Info, colorClass: 'bg-blue-500' },
    warning: { icon: AlertTriangle, colorClass: 'bg-amber-500' },
    error: { icon: XCircle, colorClass: 'bg-rose-500' }
}

const getConfig = (type: ToastType) => config[type] || config.success
</script>
