import DOMPurify from 'dompurify'
import katex from 'katex'

// Math in statements: $...$ is inline, $$...$$ is display, \$ is a literal dollar sign. Runs on HTML that
// sanitizeHtml has already cleaned, then sanitises its own output again, so nothing KaTeX emits is trusted.

// Bounds on what one author can make the browser do. A macro may expand at most this many times (KaTeX's
// default, kept explicit), and a size such as \rule{99999em}{1em} is clamped to this many em.
const MAX_EXPAND = 1000
const MAX_SIZE_EM = 50

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

// throwOnError:false only covers KaTeX's ParseError. Anything else (a RangeError from thousands of nested braces, an
// internal bug) would break the whole statement, so the formula falls back to its own source as plain text.
function renderOne(p: { tex: string; display: boolean }): Node {
    try {
        const holder = document.createElement('template')
        holder.innerHTML = katex.renderToString(p.tex, {
            displayMode: p.display,
            throwOnError: false,
            trust: false,
            output: 'html',
            strict: 'ignore',
            maxExpand: MAX_EXPAND,
            maxSize: MAX_SIZE_EM,
        })
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
    return DOMPurify.sanitize(template.innerHTML, { USE_PROFILES: { html: true, svg: true } })
}
