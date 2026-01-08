<template>
    <Card>
        <CardContent class="p-6 space-y-6">
            <div class="flex items-center gap-4">
                <div class="w-[200px]">
                    <Label class="mb-2 block text-sm font-medium text-slate-700">Language</Label>
                    <Select default-value="cpp">
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="c">C (GCC 9.3.0)</SelectItem>
                            <SelectItem value="cpp">C++ (G++ 9.3.0)</SelectItem>
                            <SelectItem value="java">Java (OpenJDK 11)</SelectItem>
                            <SelectItem value="python3">Python 3.8</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label class="mb-2 block text-sm font-medium text-slate-700">Source Code</Label>
                <div class="relative">
                    <Textarea placeholder="Paste your code here..." class="min-h-[400px] font-mono text-sm leading-relaxed" />
                </div>
            </div>

            <div class="flex items-center gap-3">
                <Button class="bg-blue-600 hover:bg-blue-700 pl-6 pr-6">
                    Submit
                </Button>
                <Button variant="outline">
                    Reset
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
</script>
