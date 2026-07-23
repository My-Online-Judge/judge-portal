<template>
    <section class="rounded-xl border border-border bg-card">
        <div class="border-b border-border px-5 py-3.5">
            <h3 class="text-base font-medium text-foreground">Import problem</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">
                Create a problem from an exported package (.zip with problem.json + testcases/).
            </p>
        </div>

        <div class="space-y-4 p-5">
            <!-- File picker -->
            <div class="flex flex-wrap items-center gap-3">
                <input
                    ref="fileInput"
                    type="file"
                    accept=".zip,application/zip"
                    class="hidden"
                    @change="onFileChosen"
                />
                <Button type="button" variant="outline" :disabled="importing" @click="fileInput?.click()">
                    <Upload class="size-4" />
                    Choose package
                </Button>
                <span v-if="fileName" class="font-mono text-xs text-muted-foreground">{{ fileName }}</span>
            </div>

            <p v-if="parseError" class="text-sm text-destructive">{{ parseError }}</p>

            <!-- Preview -->
            <div v-if="preview" class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div class="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    <div><span class="text-muted-foreground">Title:</span> {{ preview.problem.title }}</div>
                    <div><span class="text-muted-foreground">Subject:</span> {{ preview.problem.subject }}</div>
                    <div><span class="text-muted-foreground">Limits:</span>
                        {{ preview.problem.timeLimit }} ms / {{ preview.problem.memoryLimit }} MB</div>
                    <div><span class="text-muted-foreground">Test cases:</span> {{ preview.testCaseCount }}</div>
                </div>

                <div class="max-w-sm space-y-1.5">
                    <Label for="import-slug">Slug</Label>
                    <Input id="import-slug" v-model="slug" placeholder="problem-slug" :disabled="importing" />
                    <p v-if="importError" class="text-sm text-destructive">{{ importError }}</p>
                </div>

                <Button type="button" :disabled="importing || !slug.trim()" @click="runImport">
                    <Loader2 v-if="importing" class="size-4 animate-spin" />
                    <Upload v-else class="size-4" />
                    Import
                </Button>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Upload } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import { parseProblemPackage, type ProblemPackagePreview } from '@/lib/problemPackage'
import problemService from '@/services/problemService'

const router = useRouter()
const { triggerToast } = useToast()

const fileInput = ref<HTMLInputElement>()
const file = ref<File | null>(null)
const fileName = ref('')
const preview = ref<ProblemPackagePreview | null>(null)
const slug = ref('')
const parseError = ref('')
const importError = ref('')
const importing = ref(false)

async function onFileChosen(event: Event) {
    const chosen = (event.target as HTMLInputElement).files?.[0]
    if (!chosen) return

    (event.target as HTMLInputElement).value = ''

    file.value = chosen
    fileName.value = chosen.name
    preview.value = null
    parseError.value = ''
    importError.value = ''

    try {
        preview.value = await parseProblemPackage(chosen)
        slug.value = preview.value.problem.problemSlug ?? ''
    } catch (err) {
        parseError.value = err instanceof Error ? err.message : 'Could not read the package'
    }
}

async function runImport() {
    if (!file.value || !preview.value) return
    importing.value = true
    importError.value = ''
    try {
        const override = slug.value.trim() !== preview.value.problem.problemSlug ? slug.value.trim() : undefined
        const res = await problemService.importProblem(file.value, override)
        const created = res.data.data
        triggerToast(`Problem "${created.title}" imported`, 'success')
        router.push({ name: 'AdminProblemDetail', params: { slug: created.problemSlug } })
    } catch (err) {
        // 409 (slug taken) and 400 (bad package) both surface inline so the user can fix and retry
        importError.value = getErrorMessage(err, 'Could not import the problem.')
    } finally {
        importing.value = false
    }
}
</script>
