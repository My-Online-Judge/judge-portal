<template>
    <div
        class="rte"
        :class="editable
            ? 'rte--editable rounded-md border border-input bg-background transition-[color,box-shadow] focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring'
            : ''"
    >
        <!-- Toolbar (editable only) -->
        <div
            v-if="editable && editor"
            class="flex flex-wrap items-center gap-0.5 border-b border-input px-1.5 py-1"
        >
            <button type="button" :class="btnClass(editor.isActive('bold'))" aria-label="Bold" title="Bold" @click="editor.chain().focus().toggleBold().run()">
                <Bold class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('italic'))" aria-label="Italic" title="Italic" @click="editor.chain().focus().toggleItalic().run()">
                <Italic class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('strike'))" aria-label="Strikethrough" title="Strikethrough" @click="editor.chain().focus().toggleStrike().run()">
                <Strikethrough class="size-4" />
            </button>

            <span class="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

            <button type="button" :class="btnClass(editor.isActive('heading', { level: 2 }))" aria-label="Heading 2" title="Heading 2" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
                <Heading2 class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('heading', { level: 3 }))" aria-label="Heading 3" title="Heading 3" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
                <Heading3 class="size-4" />
            </button>

            <span class="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

            <button type="button" :class="btnClass(editor.isActive('bulletList'))" aria-label="Bullet list" title="Bullet list" @click="editor.chain().focus().toggleBulletList().run()">
                <List class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('orderedList'))" aria-label="Ordered list" title="Ordered list" @click="editor.chain().focus().toggleOrderedList().run()">
                <ListOrdered class="size-4" />
            </button>

            <span class="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

            <button type="button" :class="btnClass(editor.isActive('code'))" aria-label="Inline code" title="Inline code" @click="editor.chain().focus().toggleCode().run()">
                <Code class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('codeBlock'))" aria-label="Code block" title="Code block" @click="editor.chain().focus().toggleCodeBlock().run()">
                <SquareCode class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('blockquote'))" aria-label="Blockquote" title="Blockquote" @click="editor.chain().focus().toggleBlockquote().run()">
                <Quote class="size-4" />
            </button>
            <button type="button" :class="btnClass(editor.isActive('link'))" aria-label="Link" title="Link" @click="setLink">
                <LinkIcon class="size-4" />
            </button>

            <span class="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

            <button type="button" :class="btnClass(false)" :disabled="!editor.can().undo()" aria-label="Undo" title="Undo" @click="editor.chain().focus().undo().run()">
                <Undo2 class="size-4" />
            </button>
            <button type="button" :class="btnClass(false)" :disabled="!editor.can().redo()" aria-label="Redo" title="Redo" @click="editor.chain().focus().redo().run()">
                <Redo2 class="size-4" />
            </button>
        </div>

        <EditorContent :editor="editor" />
    </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
    Bold,
    Italic,
    Strikethrough,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Code,
    SquareCode,
    Quote,
    Link as LinkIcon,
    Undo2,
    Redo2,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
    defineProps<{
        modelValue: string
        editable?: boolean
        placeholder?: string
    }>(),
    {
        editable: true,
        placeholder: '',
    },
)

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

const editor = useEditor({
    content: props.modelValue,
    editable: props.editable,
    extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: props.placeholder }),
    ],
    onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
})

// Keep the editor in sync when the bound HTML changes from the outside,
// without echoing back through onUpdate (setContent emitUpdate = false).
watch(
    () => props.modelValue,
    (value) => {
        const instance = editor.value
        if (instance && value !== instance.getHTML()) {
            instance.commands.setContent(value || '', false)
        }
    },
)

watch(
    () => props.editable,
    (value) => editor.value?.setEditable(value),
)

const setLink = () => {
    const instance = editor.value
    if (!instance) return
    const previous = instance.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? '')
    if (url === null) return // cancelled
    if (url === '') {
        instance.chain().focus().extendMarkRange('link').unsetLink().run()
        return
    }
    instance.chain().focus().extendMarkRange('link').toggleLink({ href: url }).run()
}

const btnClass = (active?: boolean) =>
    cn(
        'flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent text-foreground',
    )

onBeforeUnmount(() => editor.value?.destroy())
</script>

<style scoped>
/* ProseMirror surface — no default focus outline (the wrapper shows focus). */
.rte :deep(.tiptap) {
    outline: none;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--foreground);
}
.rte :deep(.ProseMirror:focus) {
    outline: none;
}

/* Padding + a comfortable min-height only in edit mode; readonly is bare prose. */
.rte--editable :deep(.tiptap) {
    min-height: 7rem;
    padding: 0.625rem 0.75rem;
}

/* Paragraph rhythm */
.rte :deep(.tiptap p) {
    margin: 0.5rem 0;
}
.rte :deep(.tiptap > :first-child) {
    margin-top: 0;
}
.rte :deep(.tiptap > :last-child) {
    margin-bottom: 0;
}

/* Headings */
.rte :deep(.tiptap h2) {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 1rem 0 0.5rem;
}
.rte :deep(.tiptap h3) {
    font-size: 1.075rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 0.875rem 0 0.5rem;
}

/* Lists */
.rte :deep(.tiptap ul) {
    list-style: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
}
.rte :deep(.tiptap ol) {
    list-style: decimal;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
}
.rte :deep(.tiptap li) {
    margin: 0.2rem 0;
}
.rte :deep(.tiptap li > p) {
    margin: 0;
}

/* Inline code */
.rte :deep(.tiptap code) {
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.85em;
    background-color: var(--muted);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
}

/* Code block */
.rte :deep(.tiptap pre) {
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.85em;
    background-color: var(--muted);
    border-radius: 0.375rem;
    padding: 0.75rem;
    overflow-x: auto;
    margin: 0.75rem 0;
}
.rte :deep(.tiptap pre code) {
    background: none;
    padding: 0;
    font-size: inherit;
}

/* Blockquote */
.rte :deep(.tiptap blockquote) {
    border-left: 3px solid var(--border);
    padding-left: 1rem;
    margin: 0.75rem 0;
    color: var(--muted-foreground);
}

/* Links */
.rte :deep(.tiptap a) {
    color: var(--primary);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
}

/* Placeholder (extension-placeholder) */
.rte :deep(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: var(--muted-foreground);
    float: left;
    height: 0;
    pointer-events: none;
}
</style>
