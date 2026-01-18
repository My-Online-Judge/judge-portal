<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { AvatarImage, type AvatarImageProps } from 'reka-ui'

const props = defineProps<AvatarImageProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
    <AvatarImage v-bind="props" class="aspect-square h-full w-full" />
</template>
