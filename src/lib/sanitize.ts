import DOMPurify from 'dompurify'

/**
 * Sanitize author-supplied rich-text HTML (produced by the tiptap editor) before
 * it is rendered with v-html. Strips <script>, event-handler attributes, and other
 * XSS vectors while keeping the formatting tags tiptap emits (headings, lists,
 * links, code, blockquote, …).
 *
 * An explicit allow-list, not DOMPurify's `html` profile: that profile keeps <style>, <form>, <input>, <button> and
 * inline `style`, `id` and `name`, so an author could restyle the portal's own page or plant a fake login form
 * inside a statement. Allowed here: what tiptap's StarterKit (with sub/superscript) emits, images, tables and the
 * inline tags imported statements use. `target` is not allowed (a link opens in the same tab). Only the author's own
 * HTML goes through this list; math.ts sanitises the rendered formulas, which need `style`, separately.
 *
 * The nullish guard returns '' so callers can pass optional fields (hint, etc.)
 * straight through without their own emptiness check.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
    if (!dirty) return ''
    return withNoReferrerImages(() => DOMPurify.sanitize(dirty, STATEMENT_POLICY))
}

const STATEMENT_POLICY = {
    ALLOWED_TAGS: [
        'p', 'br', 'hr', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'b', 'em', 'i', 's', 'strike', 'del', 'ins', 'u', 'mark', 'small', 'sub', 'sup',
        'code', 'pre', 'kbd', 'samp', 'var', 'blockquote',
        'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    ],
    ALLOWED_ATTR: ['href', 'rel', 'title', 'class', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
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
