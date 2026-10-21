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
    return withNoReferrerImages(() => DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } }))
}

const HTML_NS = 'http://www.w3.org/1999/xhtml'

// A statement image never tells its host which page the viewer is on, nor the portal's address. DOMPurify's html
// profile does not allow referrerpolicy, so the hook sets it after the attributes are sanitised.
const imagesSendNoReferrer = (node: Element) => {
    if (node.localName === 'img' && node.namespaceURI === HTML_NS) node.setAttribute('referrerpolicy', 'no-referrer')
}

/** Runs one sanitise with the image hook registered for that call only (removed even if it throws). */
export function withNoReferrerImages<T>(sanitize: () => T): T {
    DOMPurify.addHook('afterSanitizeAttributes', imagesSendNoReferrer)
    try {
        return sanitize()
    } finally {
        DOMPurify.removeHook('afterSanitizeAttributes', imagesSendNoReferrer)
    }
}
