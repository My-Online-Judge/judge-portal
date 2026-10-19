<template>
    <DropdownMenuSub>
        <DropdownMenuSubTrigger>
            <span>Theme</span>
            <span class="ml-auto text-xs text-muted-foreground">{{ labels[mode] }}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
            <DropdownMenuRadioGroup :model-value="mode" @update:model-value="onChange">
                <DropdownMenuRadioItem v-for="m in modes" :key="m" :value="m">
                    {{ labels[m] }}
                </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
    </DropdownMenuSub>
</template>

<script setup lang="ts">
import {
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { readMode, useTheme, type ThemeMode } from '@/composables/useTheme'

const { mode, setMode } = useTheme()

const modes: ThemeMode[] = ['system', 'light', 'dark']
const labels: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' }

const onChange = (value: unknown) => setMode(readMode(typeof value === 'string' ? value : null))
</script>
