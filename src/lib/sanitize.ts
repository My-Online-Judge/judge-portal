import DOMPurify from 'dompurify'

/**
 * Sanitize author-supplied rich-text HTML (produced by the tiptap editor) before
 * it is rendered with v-html. Strips <script>, event-handler attributes, and other
 * XSS vectors while keeping the formatting tags tiptap emits (headings, lists,
 * links, code, blockquote, …).
 *
 * The nullish guard returns '' so callers can pass optional fields (hint, etc.)
 * straight through without their own emptiness check.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
    if (!dirty) return ''
    return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } })
}
