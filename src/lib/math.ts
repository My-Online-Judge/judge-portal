import DOMPurify from 'dompurify'
import katex from 'katex'
import { withNoReferrerImages } from './sanitize'

// Math in statements: $...$ is inline, $$...$$ is display, \$ is a literal dollar sign. Runs on HTML that
// sanitizeHtml has already cleaned. Nothing KaTeX emits is trusted: each formula goes through sanitizeMathOutput, and
// the whole statement is sanitised once more (sanitizeMathStatement) after the formulas are put in.

// Bounds on what one author can make the browser do. A macro may expand at most this many times (KaTeX's
// default, kept explicit), and a size such as \rule{99999em}{1em} is clamped to this many em.
const MAX_EXPAND = 1000
const MAX_SIZE_EM = 50

// Every MathML tag and attribute KaTeX 0.16.47 emits for the corpus in the tests (which pin the lists to it). style
// (on mstyle for \pmb, on menclose for \fcolorbox) is withheld on purpose: dropping it only changes the visually
// hidden MathML copy. DOMPurify allows exactly these on top of its html and svg profiles: never its whole MathML
// profile, never annotation-xml, maction or mglyph, never an href.
export const KATEX_MATHML_TAGS: readonly string[] = Object.freeze([
    'annotation', 'math', 'menclose', 'mfrac', 'mi', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow',
    'mspace', 'msqrt', 'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover',
    'semantics',
])
export const KATEX_MATHML_ATTRS: readonly string[] = Object.freeze([
    'accent', 'accentunder', 'columnalign', 'columnlines', 'columnspacing', 'depth', 'display', 'displaystyle',
    'encoding', 'fence', 'height', 'largeop', 'linebreak', 'linethickness', 'lspace', 'mathbackground', 'mathcolor',
    'mathsize', 'mathvariant', 'maxsize', 'minsize', 'notation', 'rowlines', 'rowspacing', 'rspace', 'scriptlevel',
    'separator', 'stretchy', 'voffset', 'width', 'xmlns',
])

// What the html and svg profiles keep but a statement never needs: the page-restyling and form elements (the author's own
// HTML already went through sanitizeHtml's allow-list, so these can only come from a second route in). `style` the
// attribute stays: KaTeX positions every glyph with it.
const STATEMENT_FORBIDDEN_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select', 'option', 'optgroup', 'iframe']

/** Sanitises rendered math: KaTeX's HTML and SVG, plus exactly the MathML it emits. */
export function sanitizeMathOutput(html: string): string {
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true, svg: true },
        ADD_TAGS: [...KATEX_MATHML_TAGS],
        ADD_ATTR: [...KATEX_MATHML_ATTRS],
        FORBID_TAGS: ['annotation-xml', 'maction', 'mglyph'],
        FORBID_ATTR: ['href', 'xlink:href'],
    })
}

const HTML_NS = 'http://www.w3.org/1999/xhtml'
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML'
const LINK_ATTRS = new Set(['href', 'xlink:href'])
const MATHML_ATTRS = new Set(KATEX_MATHML_ATTRS)

// Drops a link on anything that is not an HTML element (MathML, SVG): an author's <a href> keeps working. DOMPurify's
// attribute allowlist is global, so on a MathML element this also drops every attribute KaTeX never emits (style,
// class, id), and xmlns anywhere but on <math> naming MathML.
const dropForeignAttrs = (node: Element, data: { attrName: string; attrValue: string; keepAttr: boolean }) => {
    if (LINK_ATTRS.has(data.attrName) && node.namespaceURI !== HTML_NS) data.keepAttr = false
    if (node.namespaceURI !== MATHML_NS) return
    if (data.attrName === 'xmlns') {
        if (node.localName !== 'math' || data.attrValue !== MATHML_NS) data.keepAttr = false
    } else if (!MATHML_ATTRS.has(data.attrName)) data.keepAttr = false
}

/**
 * The second pass, over the whole statement with its formulas in place: the same profiles and MathML lists, but an
 * href is dropped only outside HTML, so the statement's own links survive; MathML keeps only the attributes KaTeX
 * emits; and images get no-referrer as in
 * sanitizeHtml. The hooks are registered for this call only.
 */
export function sanitizeMathStatement(html: string): string {
    DOMPurify.addHook('uponSanitizeAttribute', dropForeignAttrs)
    try {
        return withNoReferrerImages(() => DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true, svg: true },
            ADD_TAGS: [...KATEX_MATHML_TAGS],
            ADD_ATTR: [...KATEX_MATHML_ATTRS],
            FORBID_TAGS: [...STATEMENT_FORBIDDEN_TAGS, 'annotation-xml', 'maction', 'mglyph'],
        }))
    } finally {
        DOMPurify.removeHook('uponSanitizeAttribute', dropForeignAttrs)
    }
}

const SKIP = 'code, pre'
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c)
const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9'

type Piece = { text: string } | { tex: string; display: boolean }

// Index of the closing delimiter for the span opening at `from`, or -1.
function findClose(s: string, from: number, display: boolean): number {
    for (let j = from; j < s.length; j++) {
        if (s[j] === '\\') {
            j++
            continue
        }
        if (s[j] !== '$') continue
        if (display) {
            if (s[j + 1] === '$') return j
            continue
        }
        if (!isSpace(s[j - 1]) && !isDigit(s[j + 1]) && j > from) return j
    }
    return -1
}

function split(s: string): Piece[] {
    const pieces: Piece[] = []
    let buf = ''
    let i = 0
    while (i < s.length) {
        const c = s[i]
        if (c === '\\' && s[i + 1] === '$') {
            buf += '$'
            i += 2
            continue
        }
        if (c === '$') {
            const display = s[i + 1] === '$'
            const start = i + (display ? 2 : 1)
            const open = !isSpace(s[start]) || display
            const end = open ? findClose(s, start, display) : -1
            if (end > start) {
                if (buf) pieces.push({ text: buf })
                buf = ''
                pieces.push({ tex: s.slice(start, end), display })
                i = end + (display ? 2 : 1)
                continue
            }
        }
        buf += c
        i++
    }
    if (buf) pieces.push({ text: buf })
    return pieces
}

function texNodes(root: Node): Text[] {
    const found: Text[] = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n as Text
        if (!t.data.includes('$') || t.parentElement?.closest(SKIP)) continue
        found.push(t)
    }
    return found
}

/**
 * KaTeX nests elements inside an <mo> for a few constructs (\bmod, \overset and \underset of a relation). <mo> is a
 * MathML text integration point, so the HTML parser builds those children as HTML elements, which DOMPurify drops
 * with their text. Each non-MathML element under <math> is replaced by its children, innermost first, so the <mo>
 * keeps its text ("mod", "=") for screen readers. The result is still sanitised.
 */
function unwrapStrayHtml(rendered: string): string {
    const holder = document.createElement('template')
    holder.innerHTML = rendered
    const stray = [...holder.content.querySelectorAll('math *')].filter((el) => el.namespaceURI !== MATHML_NS)
    if (stray.length === 0) return rendered
    for (const el of stray.reverse()) el.replaceWith(...el.childNodes)
    return holder.innerHTML
}

// throwOnError:false only covers KaTeX's ParseError. Anything else (a RangeError from thousands of nested braces, an
// internal bug) would break the whole statement, so the formula falls back to its own source as plain text.
function renderOne(p: { tex: string; display: boolean }): Node {
    try {
        const holder = document.createElement('template')
        holder.innerHTML = sanitizeMathOutput(unwrapStrayHtml(katex.renderToString(p.tex, {
            displayMode: p.display,
            throwOnError: false,
            trust: false,
            output: 'htmlAndMathml',
            strict: 'ignore',
            maxExpand: MAX_EXPAND,
            maxSize: MAX_SIZE_EM,
        })))
        return holder.content
    } catch {
        const mark = p.display ? '$$' : '$'
        return document.createTextNode(mark + p.tex + mark)
    }
}

export function renderMath(safeHtml: string): string {
    if (!safeHtml || !safeHtml.includes('$')) return safeHtml
    const template = document.createElement('template')
    template.innerHTML = safeHtml
    let changed = false
    for (const node of texNodes(template.content)) {
        const pieces = split(node.data)
        const only = pieces[0]
        if (pieces.length === 1 && only && 'text' in only && only.text === node.data) continue
        const frag = document.createDocumentFragment()
        for (const p of pieces) {
            if ('text' in p) {
                frag.append(document.createTextNode(p.text))
                continue
            }
            frag.append(renderOne(p))
        }
        node.replaceWith(frag)
        changed = true
    }
    if (!changed) return safeHtml
    return sanitizeMathStatement(template.innerHTML)
}
