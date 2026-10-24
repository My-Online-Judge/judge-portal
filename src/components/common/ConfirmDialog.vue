<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, Trash2, TriangleAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel?: string
    destructive?: boolean
    tone?: 'neutral' | 'destructive'
    busy?: boolean
  }>(),
  { cancelLabel: 'Cancel', destructive: true, tone: undefined, busy: false },
)

// tone wins over the legacy destructive flag when both are given.
const resolvedTone = computed<'neutral' | 'destructive'>(() =>
  props.tone ?? (props.destructive ? 'destructive' : 'neutral'),
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

function onOpenChange(value: boolean) {
  if (props.busy) return
  emit('update:open', value)
}

function onConfirm() {
  if (props.busy) return
  emit('confirm')
}
</script>

<template>
  <AlertDialog :open="open" @update:open="onOpenChange">
    <AlertDialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
      <AlertDialogHeader class="flex-row items-start gap-3 px-5 pt-[18px] pb-4 text-left">
        <span
          data-slot="confirm-icon"
          :data-tone="resolvedTone"
          aria-hidden="true"
          :class="[
            'grid size-9 flex-none place-items-center rounded-[10px] [&_svg]:size-[18px]',
            resolvedTone === 'destructive'
              ? 'bg-destructive-soft text-destructive-ink'
              : 'bg-warning-soft text-warning-ink',
          ]"
        >
          <Trash2 v-if="resolvedTone === 'destructive'" />
          <TriangleAlert v-else />
        </span>
        <div class="flex min-w-0 flex-col gap-1">
          <AlertDialogTitle class="text-base leading-snug font-semibold">{{ title }}</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground">{{ description }}</AlertDialogDescription>
        </div>
      </AlertDialogHeader>
      <div v-if="$slots.default" data-slot="confirm-body" class="px-5 pb-4">
        <slot />
      </div>
      <AlertDialogFooter class="border-t bg-muted/55 px-5 py-3.5">
        <AlertDialogCancel :disabled="busy" class="mt-0">{{ cancelLabel }}</AlertDialogCancel>
        <Button
          :variant="resolvedTone === 'destructive' ? 'destructive' : 'default'"
          :disabled="busy"
          @click="onConfirm"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
