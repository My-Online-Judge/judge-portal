<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { AvatarImage, type AvatarImageProps } from 'reka-ui'

const props = defineProps<AvatarImageProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
    <AvatarImage v-bind="props" :class="cn('aspect-square h-full w-full rounded-[inherit]', props.class)" />
</template>
