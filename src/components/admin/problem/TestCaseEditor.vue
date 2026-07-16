<script lang="ts">
/**
 * Repeatable input/output pair editor for a problem's judge test data.
 * Create-only: the backend has no endpoint to modify test cases after
 * creation, so this is never mounted on the detail/edit page. The hosting
 * page zips the pairs client-side (`1.in`/`1.out`, …) into the create body.
 */
export interface TestCasePair {
    input: string
    output: string
}
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const props = defineProps<{
    modelValue: TestCasePair[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: TestCasePair[]): void
}>()

// Never render with zero rows — start from one empty pair if handed an empty array.
onMounted(() => {
    if (props.modelValue.length === 0) {
        emit('update:modelValue', [{ input: '', output: '' }])
    }
})

// Emit fresh copies so the parent's v-model stays the single source of truth.
const setField = (index: number, key: keyof TestCasePair, value: string) => {
    emit(
        'update:modelValue',
        props.modelValue.map((pair, i) => (i === index ? { ...pair, [key]: value } : pair)),
    )
}

const addPair = () => {
    emit('update:modelValue', [...props.modelValue, { input: '', output: '' }])
}

const removePair = (index: number) => {
    emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div
            v-for="(pair, i) in modelValue"
            :key="i"
            class="rounded-lg border border-border bg-background/50 p-4"
        >
            <div class="mb-3 flex items-center justify-between gap-2">
                <span class="text-sm font-medium text-foreground">Test case {{ i + 1 }}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :disabled="modelValue.length <= 1"
                    :aria-label="`Remove test case ${i + 1}`"
                    @click="removePair(i)"
                >
                    <Trash2 class="size-4" />
                </Button>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="space-y-1.5">
                    <Label :for="`tc-in-${i}`">Input</Label>
                    <Textarea
                        :id="`tc-in-${i}`"
                        rows="4"
                        class="font-mono"
                        placeholder="Input fed to the submission"
                        :model-value="pair.input"
                        @update:model-value="(v) => setField(i, 'input', String(v))"
                    />
                </div>
                <div class="space-y-1.5">
                    <Label :for="`tc-out-${i}`">Output</Label>
                    <Textarea
                        :id="`tc-out-${i}`"
                        rows="4"
                        class="font-mono"
                        placeholder="Expected output"
                        :model-value="pair.output"
                        @update:model-value="(v) => setField(i, 'output', String(v))"
                    />
                </div>
            </div>
        </div>

        <div>
            <Button type="button" variant="outline" size="sm" @click="addPair">
                <Plus class="size-4" />
                Add test case
            </Button>
        </div>
    </div>
</template>
