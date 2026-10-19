<script setup lang="ts">
import { computed } from 'vue'
import { Ellipsis } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RowAction } from './rowActions'

const props = defineProps<{
  items: RowAction[]
  label: string
}>()

const normal = computed(() => props.items.filter((i) => !i.destructive))
const destructive = computed(() => props.items.filter((i) => i.destructive))
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :aria-label="`Actions for ${label}`">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="item in normal"
        :key="item.label"
        :disabled="item.disabled"
        @select="item.onSelect()"
      >
        <component :is="item.icon" />
        {{ item.label }}
      </DropdownMenuItem>
      <DropdownMenuSeparator v-if="normal.length && destructive.length" />
      <DropdownMenuItem
        v-for="item in destructive"
        :key="item.label"
        variant="destructive"
        class="text-destructive"
        :disabled="item.disabled"
        @select="item.onSelect()"
      >
        <component :is="item.icon" />
        {{ item.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
