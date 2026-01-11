<template>
    <Card>
        <CardContent class="p-6 space-y-6">
            <div class="flex items-end justify-between gap-3">
                <div class="w-30">
                    <Label class="mb-2 block text-sm font-medium text-slate-700">Language</Label>
                    <Select v-model="selectedLanguage">
                        <SelectTrigger class="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="lang in languages" :key="lang.id" :value="lang.identifier">
                                {{ lang.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button size="icon" class="h-10 w-10 shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700">
                    <RotateCcw class="h-4 w-4" />
                </Button>
            </div>

            <div>
                <Label class="mb-2 block text-sm font-medium text-slate-700">Source Code</Label>
                <div class="relative">
                    <Textarea placeholder="Paste your code here..." class="min-h-[400px] font-mono text-sm leading-relaxed" />
                </div>
            </div>

            <div class="flex items-center justify-end gap-3">
                <Button class="bg-blue-600 hover:bg-blue-700 pl-6 pr-6 cursor-pointer">
                    <Send class="h-4 w-4" /> Submit
                </Button>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RotateCcw, Send } from 'lucide-vue-next'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { Language } from '@/types/language'

import { ref, watch } from 'vue'

const props = defineProps<{
    languages?: Language[]
}>()

const selectedLanguage = ref('')

watch(() => props.languages, (newVal) => {
    if (newVal && newVal.length > 0 && !selectedLanguage.value) {
        const firstLang = newVal[0]
        if (firstLang) {
            selectedLanguage.value = firstLang.identifier
        }
    }
}, { immediate: true })
</script>
