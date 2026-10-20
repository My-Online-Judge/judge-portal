<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="sm:max-w-2xl" @pointer-down-outside="onPointerDownOutside" @escape-key-down="onEscape">
            <DialogHeader>
                <DialogTitle>{{ editing ? 'Edit contest' : 'New contest' }}</DialogTitle>
                <DialogDescription>
                    {{ editing ? 'Changes apply when you save.' : 'Students see it once you publish it.' }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="loadState === 'loading'" class="flex justify-center py-12" aria-busy="true">
                <Loader2 class="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
                <span class="sr-only">Loading the contest</span>
            </div>

            <div v-else-if="loadState === 'error'" role="alert" class="flex flex-col items-center gap-2.5 py-10 text-center">
                <p class="text-sm text-muted-foreground">Couldn't load this contest.</p>
                <Button variant="secondary" size="sm" @click="load">
                    <RotateCw class="size-4" />
                    Retry
                </Button>
            </div>

            <form v-else class="flex min-w-0 flex-col gap-4" novalidate @submit.prevent="submit">
                <div class="-mx-1 flex max-h-[62vh] flex-col gap-4 overflow-y-auto px-1 pb-1">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="space-y-1.5">
                            <Label for="contest-slug">Slug</Label>
                            <Input
                                id="contest-slug"
                                v-model="form.slug"
                                :readonly="editing"
                                class="font-mono read-only:bg-muted read-only:text-muted-foreground"
                                autocomplete="off"
                                spellcheck="false"
                                placeholder="spring-cup-2026"
                                aria-describedby="contest-slug-hint"
                            />
                            <p id="contest-slug-hint" class="text-xs text-muted-foreground">
                                {{ editing ? "The slug can't be changed." : "Lowercase letters, digits and hyphens. It can't be changed later." }}
                            </p>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="contest-status">Status</Label>
                            <Select v-model="form.status">
                                <SelectTrigger id="contest-status" class="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="PUBLISHED">Published</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">Drafts are hidden from students.</p>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <Label for="contest-title">Title</Label>
                        <Input id="contest-title" v-model="form.title" autocomplete="off" />
                    </div>

                    <div class="space-y-1.5">
                        <Label for="contest-description">Description <span class="font-normal text-muted-foreground">(optional)</span></Label>
                        <Textarea id="contest-description" v-model="form.description" rows="3" />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <div class="grid gap-4 sm:grid-cols-2">
                            <div class="space-y-1.5">
                                <Label for="contest-starts">Starts</Label>
                                <Input
                                    id="contest-starts"
                                    v-model="form.startsLocal"
                                    type="datetime-local"
                                    :disabled="locked"
                                    :aria-describedby="locked ? 'contest-locked' : undefined"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <Label for="contest-ends">Ends</Label>
                                <Input id="contest-ends" v-model="form.endsLocal" type="datetime-local" />
                            </div>
                        </div>
                        <p class="text-xs text-muted-foreground">In your time zone.</p>
                    </div>

                    <p v-if="locked" id="contest-locked" class="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
                        <Lock class="size-4 shrink-0" aria-hidden="true" />
                        Problems and start time are locked once the contest has started
                    </p>

                    <section class="flex flex-col gap-2" aria-labelledby="contest-problems-heading">
                        <div class="flex items-baseline justify-between gap-3">
                            <h3 id="contest-problems-heading" class="text-sm font-medium">Problems</h3>
                            <span v-if="!problemsHidden" class="text-xs text-muted-foreground">
                                <span class="font-mono text-foreground">{{ form.problemSlugs.length }}</span> of
                                <span class="font-mono text-foreground">{{ MAX_CONTEST_PROBLEMS }}</span>, labelled in this order
                            </span>
                        </div>

                        <p v-if="problemsHidden" class="rounded-lg border border-dashed border-border px-3 py-2.5 text-[13px] text-muted-foreground">
                            You can't see this contest's problems before it starts. Saving keeps them as they are.
                        </p>

                        <template v-else>
                            <div v-if="!locked" class="flex flex-col gap-2">
                                <ProblemPicker v-model="pickedSlug" :exclude-slugs="form.problemSlugs" @pick="onPick" />
                                <Button type="button" variant="secondary" size="sm" class="self-start" :disabled="!canAdd" @click="addPicked">
                                    <Plus class="size-4" />
                                    Add
                                </Button>
                            </div>

                            <ol
                                v-if="form.problemSlugs.length"
                                aria-label="Contest problems"
                                class="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-border p-0"
                                :aria-describedby="locked ? 'contest-locked' : undefined"
                            >
                                <li
                                    v-for="(slug, i) in form.problemSlugs"
                                    :key="slug"
                                    class="flex items-center gap-3 border-b border-border px-3 py-1.5 last:border-b-0"
                                >
                                    <span class="w-5 shrink-0 font-mono text-sm font-semibold">{{ labelFor(i) }}</span>
                                    <span class="flex min-w-0 flex-1 flex-col">
                                        <span class="truncate text-sm font-medium">{{ titles[slug] ?? slug }}</span>
                                        <span class="truncate font-mono text-[11.5px] text-muted-foreground">{{ slug }}</span>
                                    </span>
                                    <span class="flex shrink-0 items-center">
                                        <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Move ${labelFor(i)} up`" :disabled="locked || i === 0" @click="move(i, -1)">
                                            <ArrowUp />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            :aria-label="`Move ${labelFor(i)} down`"
                                            :disabled="locked || i === form.problemSlugs.length - 1"
                                            @click="move(i, 1)"
                                        >
                                            <ArrowDown />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Remove ${labelFor(i)}`" :disabled="locked" @click="remove(i)">
                                            <X />
                                        </Button>
                                    </span>
                                </li>
                            </ol>
                            <p v-else class="text-[13px] text-muted-foreground">No problems yet. Search for them above and add them in contest order.</p>
                        </template>
                    </section>
                </div>

                <DialogFooter class="items-center gap-2">
                    <p v-if="attempted && invalid" role="alert" class="text-[13px] text-destructive-ink sm:mr-auto">{{ invalid }}</p>
                    <Button type="button" variant="secondary" :disabled="saving" @click="onOpenChange(false)">Cancel</Button>
                    <Button type="submit" :disabled="saving">
                        <Loader2 v-if="saving" class="size-4 animate-spin" />
                        {{ editing ? 'Save changes' : 'Create contest' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { ArrowDown, ArrowUp, Loader2, Lock, Plus, RotateCw, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import ProblemPicker from '@/components/admin/ProblemPicker.vue'
import { ensureFreshSession } from '@/api/refreshSession'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import {
    MAX_CONTEST_PROBLEMS,
    isoToLocal,
    labelFor,
    toPayload,
    validateContestForm,
    type ContestForm,
    type ContestOriginal,
} from '@/lib/contestForm'
import contestService from '@/services/contestService'
import type { ContestDetail } from '@/types/contest'
import type { Problem } from '@/types/problem'

// `slug` null creates a contest; a slug edits that one, read fresh from the API (the list has no description or problems).
const props = defineProps<{ open: boolean; slug: string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [contest: ContestDetail] }>()

const { error: errorToast } = useToast()

const editing = computed(() => props.slug !== null)
const blank = (): ContestForm => ({
    slug: '',
    title: '',
    description: '',
    startsLocal: '',
    endsLocal: '',
    status: 'DRAFT',
    problemSlugs: [],
})
const form = reactive<ContestForm>(blank())
// What the form started from, to tell a change from none (the scrim click) and to build an edit's body.
let snapshot = JSON.stringify(blank())
const dirty = computed(() => JSON.stringify(form) !== snapshot)

const titles = reactive<Record<string, string>>({})
const original = ref<ContestDetail | null>(null)
const loadState = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const saving = ref(false)
const attempted = ref(false)

// A published contest that has started keeps its start and problems (the server answers 409 otherwise).
const locked = computed(() => original.value?.status === 'PUBLISHED' && original.value.phase !== 'UPCOMING')
// A contest always has problems: an empty list means the caller may not see them yet (contest:update without
// problem:update, before the start). The edit then leaves them out, which keeps them.
const problemsHidden = computed(() => editing.value && original.value?.problems.length === 0)
const invalid = computed(() =>
    validateContestForm(form, editing.value ? 'edit' : 'create', { problemsHidden: problemsHidden.value }),
)

// The picker's choice, until Add puts it on the list.
const pickedSlug = ref<string | null>(null)
let picked: Problem | null = null

const reset = (next: ContestForm) => {
    Object.assign(form, next, { problemSlugs: [...next.problemSlugs] })
    snapshot = JSON.stringify(form)
    attempted.value = false
    pickedSlug.value = null
    picked = null
}

let seq = 0
let inFlight: AbortController | null = null

async function load() {
    if (!props.slug) return
    const mine = ++seq
    inFlight?.abort()
    const ctl = new AbortController()
    inFlight = ctl
    loadState.value = 'loading'
    try {
        // A draft's problems come only with a valid token: the detail is public and answers a lapsed one as anonymous.
        await ensureFreshSession()
        if (mine !== seq) return
        const res = await contestService.get(ctl.signal, props.slug)
        if (mine !== seq) return
        const c = res.data.data
        original.value = c
        c.problems.forEach((p) => (titles[p.problemSlug] = p.title))
        reset({
            slug: c.slug,
            title: c.title,
            description: c.description ?? '',
            startsLocal: isoToLocal(c.startsAt),
            endsLocal: isoToLocal(c.endsAt),
            status: c.status,
            problemSlugs: c.problems.map((p) => p.problemSlug),
        })
        loadState.value = 'ready'
    } catch (err) {
        if (mine !== seq || axios.isCancel(err)) return
        loadState.value = 'error'
    } finally {
        if (inFlight === ctl) inFlight = null
    }
}

watch(
    () => [props.open, props.slug] as const,
    ([open]) => {
        seq++
        inFlight?.abort()
        if (!open) return
        original.value = null
        if (props.slug) {
            void load()
        } else {
            reset(blank())
            loadState.value = 'ready'
        }
    },
    { immediate: true },
)

// --- Problems: add, reorder, remove. Labels follow the order. ---
const onPick = (p: Problem) => (picked = p)
const canAdd = computed(
    () => !!pickedSlug.value && !form.problemSlugs.includes(pickedSlug.value) && form.problemSlugs.length < MAX_CONTEST_PROBLEMS,
)
const addPicked = () => {
    const slug = pickedSlug.value
    if (!slug || !canAdd.value) return
    if (picked?.problemSlug === slug) titles[slug] = picked.title
    form.problemSlugs.push(slug)
    pickedSlug.value = null
    picked = null
}
const move = (i: number, by: -1 | 1) => {
    const j = i + by
    if (j < 0 || j >= form.problemSlugs.length) return
    const list = form.problemSlugs
    ;[list[i], list[j]] = [list[j]!, list[i]!]
}
const remove = (i: number) => form.problemSlugs.splice(i, 1)

// --- Closing and saving ---
function onOpenChange(value: boolean) {
    if (saving.value) return
    emit('update:open', value)
}
// The scrim closes the dialog only while nothing has been typed; Esc and the close button always do (not mid-save).
const onPointerDownOutside = (e: Event) => {
    if (dirty.value || saving.value) e.preventDefault()
}
const onEscape = (e: Event) => {
    if (saving.value) e.preventDefault()
}

async function submit() {
    attempted.value = true
    if (invalid.value || saving.value) return
    saving.value = true
    try {
        let res
        if (props.slug && original.value) {
            const from: ContestOriginal = {
                startsAt: original.value.startsAt,
                endsAt: original.value.endsAt,
                problemSlugs: original.value.problems.map((p) => p.problemSlug),
            }
            res = await contestService.update(props.slug, toPayload(form, from))
        } else {
            res = await contestService.create(toPayload(form))
        }
        emit('saved', res.data.data)
        emit('update:open', false)
    } catch (err) {
        // 409 (started, scores, taken slug), 403 (unpublished problems), 400: the API says what to change.
        errorToast(getErrorMessage(err, "Couldn't save the contest. Try again."))
    } finally {
        saving.value = false
    }
}
</script>
