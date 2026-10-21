// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import katex from 'katex'
import { KATEX_MATHML_ATTRS, KATEX_MATHML_TAGS, renderMath, sanitizeMathOutput, sanitizeMathStatement } from '../math'

// The production options (src/lib/math.ts renderOne), with both outputs.
const OPTIONS = {
    throwOnError: false,
    trust: false,
    output: 'htmlAndMathml',
    strict: 'ignore',
    maxExpand: 1000,
    maxSize: 50,
} as const

const CORPUS = [
    '\\frac{a}{b}',
    '\\dfrac{a}{b}',
    '\\binom{n}{k}',
    '\\sqrt{x}',
    '\\sqrt[3]{x}',
    '\\sum_{i=1}^{n} i',
    '\\prod_{i=1}^{n} a_i',
    '\\int_a^b f(x)\\,dx',
    '\\lim_{x\\to 0} f(x)',
    'x^2_i',
    "x''",
    '\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
    '\\begin{array}{|c|l|}\\hline a&b\\\\\\hline\\end{array}',
    '\\begin{cases}a&x>0\\\\b&\\text{otherwise}\\end{cases}',
    '\\begin{aligned}a&=b\\\\c&=d\\end{aligned}',
    '\\left(\\frac{a}{b}\\right)',
    '\\lfloor x\\rfloor',
    '\\lceil x\\rceil',
    '\\vert x\\vert',
    '\\hat{x}',
    '\\vec{v}',
    '\\overline{AB}',
    '\\overbrace{a+b}^{n}',
    '\\underbrace{a+b}_{n}',
    '\\boxed{x}',
    '\\cancel{x}',
    '\\color{red}{x}',
    '\\textcolor{blue}{y}',
    '\\mathbb{R}',
    '\\mathcal{O}(n\\log n)',
    '\\mathrm{d}',
    '\\operatorname{lcm}(a, b)',
    'a \\pmod{m}',
    'a \\bmod b',
    'a \\not= b',
    'a \\le b',
    'a \\ge b',
    'a \\neq b',
    '\\xrightarrow{f}',
    '\\overset{!}{=}',
    '\\underset{x}{\\arg\\min}',
    '\\phantom{x}',
    '\\rule{1em}{0.5em}',
    '\\displaystyle\\sum_{i=1}^{n} i',
    '\\text{Tổng}',
    // Beyond the list above: the other attributes KaTeX's MathML carries for constructs statements use.
    '\\underline{x}',
    '\\bigl( x \\bigr)',
    '\\smash{x}',
    '\\begin{array}{c}a\\\\\\hline b\\end{array}',
    '{\\large x}',
    'a \\newline b',
    '\\smallint',
]

const MATHML_NS = 'http://www.w3.org/1998/Math/MathML'

/** The `.katex-mathml` subtree KaTeX emits for one formula, inline or display, as the HTML parser builds it. */
function mathmlOf(tex: string, displayMode: boolean): Element {
    const holder = document.createElement('template')
    holder.innerHTML = katex.renderToString(tex, { ...OPTIONS, displayMode })
    const mathml = holder.content.querySelector('.katex-mathml')
    if (!mathml) throw new Error(`no MathML for ${tex}`)
    return mathml
}

/**
 * KaTeX nests elements inside an <mo> for a few constructs (\bmod, \overset and \underset of a relation). <mo> is a
 * MathML text integration point, so the HTML parser builds those children as HTML elements named mrow or mi: they
 * are not MathML in any browser, and DOMPurify drops them (an HTML element with a MathML name is how mXSS hides).
 * This is the subtree with them removed, which is what must come back unchanged. (renderMath unwraps them before
 * this stage, so their text survives: see operatorsKatexNestsInsideAnMoKeepTheirText.)
 */
function withoutStrayHtml(mathml: Element): string {
    const copy = mathml.cloneNode(true) as Element
    copy.querySelectorAll('math *').forEach((el) => {
        if (el.namespaceURI !== MATHML_NS) el.remove()
    })
    return copy.outerHTML
}

describe('sanitizeMathOutput', () => {
    it('everyMathmlNodeKatexEmitsSurvives', () => {
        expect(CORPUS.length).toBeGreaterThanOrEqual(30)
        const tags = new Set<string>()
        const attrs = new Set<string>()
        const altered: string[] = []
        const stray: string[] = []
        for (const tex of CORPUS) {
            for (const display of [false, true]) {
                const mathml = mathmlOf(tex, display)
                const math = mathml.querySelector('math')!
                for (const el of [math, ...math.querySelectorAll('*')]) {
                    if (el.namespaceURI !== MATHML_NS) {
                        stray.push(`${display ? '$$' : '$'}${tex}`)
                        continue
                    }
                    tags.add(el.localName)
                    for (const a of el.attributes) attrs.add(a.name)
                }
                if (sanitizeMathOutput(mathml.outerHTML) !== withoutStrayHtml(mathml)) altered.push(`${display ? '$$' : '$'}${tex}`)
            }
        }
        // Everything KaTeX emits is listed, and nothing it does not emit.
        expect([...tags].sort()).toEqual([...KATEX_MATHML_TAGS])
        expect([...attrs].sort()).toEqual([...KATEX_MATHML_ATTRS])
        expect(altered).toEqual([])
        // Pinned, so a KaTeX upgrade that changes which formulas carry stray HTML is noticed.
        expect([...new Set(stray.map((f) => f.replace(/^\$+/, '')))]).toEqual(['a \\bmod b', '\\overset{!}{=}', '\\underset{x}{\\arg\\min}'])
    })

    it('theListsAreFrozenAndAlphabetical', () => {
        expect(Object.isFrozen(KATEX_MATHML_TAGS)).toBe(true)
        expect(Object.isFrozen(KATEX_MATHML_ATTRS)).toBe(true)
        expect([...KATEX_MATHML_TAGS]).toEqual([...KATEX_MATHML_TAGS].sort())
        expect([...KATEX_MATHML_ATTRS]).toEqual([...KATEX_MATHML_ATTRS].sort())
        expect(KATEX_MATHML_TAGS).not.toContain('annotation-xml')
        expect(KATEX_MATHML_TAGS).not.toContain('maction')
        expect(KATEX_MATHML_TAGS).not.toContain('mglyph')
        expect(KATEX_MATHML_ATTRS).not.toContain('href')
    })

    it('onlyTheListedMathmlPasses', () => {
        expectInert(sanitizeMathOutput, '<img src="x">')
        // The statement stage also gives every image no-referrer (sanitize.ts).
        expectInert(sanitizeMathStatement, '<img src="x" referrerpolicy="no-referrer">')
    })

    it('anHrefOnMathmlIsStrippedInBothStages', () => {
        const payloads = [
            '<math><mi href="https://example.com/">x</mi></math>',
            '<math><mrow xlink:href="https://example.com/"><mi>x</mi></mrow></math>',
        ]
        for (const sanitize of [sanitizeMathOutput, sanitizeMathStatement]) {
            for (const payload of payloads) {
                const doc = new DOMParser().parseFromString(sanitize(payload), 'text/html')
                expect(doc.querySelector('math mi, math mrow')).not.toBeNull()
                expect(doc.querySelector('[href], [xlink\\:href]'), `${sanitize.name}: ${payload}`).toBeNull()
                expect(sanitize(payload)).not.toContain('href')
            }
        }
    })

    it('theStatementStageKeepsHtmlLinksAndStripsSvgOnes', () => {
        const out = sanitizeMathStatement(
            '<p><a href="https://example.com/doc">doc</a></p><svg><a href="https://example.com/svg"><path d="M0 0"></path></a></svg>',
        )
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.querySelector('p a')?.getAttribute('href')).toBe('https://example.com/doc')
        expect(doc.querySelectorAll('[href]')).toHaveLength(1)
        // The strict stage strips every href, HTML links included: it only ever sees KaTeX output.
        expect(sanitizeMathOutput('<a href="https://example.com/doc">doc</a>')).not.toContain('href')
    })

    it('theStatementStageDropsMathmlAttributesKatexNeverEmits', () => {
        const payloads = [
            '<math><mi style="position:fixed" class="x" id="y" mathvariant="normal">x</mi></math>',
            '<math><mi xmlns="javascript:alert(1)">x</mi></math>',
            '<math xmlns="https://example.com/ns"><mi>x</mi></math>',
        ]
        for (const payload of payloads) {
            const doc = new DOMParser().parseFromString(sanitizeMathStatement(payload), 'text/html')
            const mi = doc.querySelector('math mi')
            expect(mi?.textContent, payload).toBe('x')
            for (const el of doc.querySelectorAll('math, math *')) {
                for (const a of el.attributes) expect(['mathvariant'], `${payload}: ${el.localName} ${a.name}`).toContain(a.name)
            }
        }
        // The attributes KaTeX does emit stay, xmlns included on <math> when it names MathML.
        const kept = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi mathvariant="normal">x</mi></math>'
        expect(sanitizeMathStatement(kept)).toBe(kept)
    })

    it('theStatementStageKeepsEverythingTheFirstStageKept', () => {
        const narrowed: string[] = []
        for (const tex of CORPUS) {
            for (const displayMode of [false, true]) {
                const first = sanitizeMathOutput(katex.renderToString(tex, { ...OPTIONS, displayMode }))
                if (sanitizeMathStatement(first) !== first) narrowed.push(`${displayMode ? '$$' : '$'}${tex}`)
            }
        }
        expect(narrowed).toEqual([])
    })

    it('theHrefHookIsGoneAfterTheCall', async () => {
        sanitizeMathStatement('<math><mi>x</mi></math>')
        const DOMPurify = (await import('dompurify')).default
        // An SVG link in plain DOMPurify keeps its href, so the hook did not stay registered.
        const plain = DOMPurify.sanitize('<svg><a href="https://example.com/svg"><path d="M0 0"></path></a></svg>', {
            USE_PROFILES: { svg: true },
        })
        expect(plain).toContain('href')
    })

    it('theHooksAreGoneWhenSanitisingThrows', async () => {
        const DOMPurify = (await import('dompurify')).default
        const spy = vi.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => {
            throw new Error('boom')
        })
        try {
            expect(() => sanitizeMathStatement('<math><mi>x</mi></math>')).toThrow('boom')
        } finally {
            spy.mockRestore()
        }
        const plain = DOMPurify.sanitize('<svg><a href="https://example.com/svg"><path d="M0 0"></path></a></svg><img src="a">', {
            USE_PROFILES: { html: true, svg: true },
        })
        expect(plain).toContain('href')
        expect(plain).not.toContain('referrerpolicy')
    })
})

describe('renderMath MathML', () => {
    it('operatorsKatexNestsInsideAnMoKeepTheirText', () => {
        // KaTeX nests elements inside these <mo>; the parser makes them HTML, so they are unwrapped, not dropped.
        const spoken: Record<string, string> = {
            'a \\bmod b': 'mod',
            '\\overset{!}{=}': '=!',
            '\\underset{x}{\\arg\\min}': 'arg',
        }
        for (const [tex, text] of Object.entries(spoken)) {
            for (const display of [false, true]) {
                const mark = display ? '$$' : '$'
                const doc = new DOMParser().parseFromString(renderMath(`<p>${mark}${tex}${mark}</p>`), 'text/html')
                const math = doc.querySelector('.katex-mathml math')
                expect(math, tex).not.toBeNull()
                expect(doc.querySelector('.katex-mathml annotation')?.textContent, tex).toBe(tex)
                for (const mo of math!.querySelectorAll('mo')) expect(mo.textContent?.trim(), `${mark}${tex}`).not.toBe('')
                const semantics = math!.querySelector('semantics')!.cloneNode(true) as Element
                semantics.querySelector('annotation')?.remove()
                expect(semantics.textContent, `${mark}${tex}`).toContain(text)
                // Unwrapping leaves only MathML under <math>.
                for (const el of math!.querySelectorAll('*')) expect(el.namespaceURI, `${mark}${tex}`).toBe(MATHML_NS)
            }
        }
    })
})

function expectInert(sanitize: (html: string) => string, img: string) {
    const payloads = [
        '<math><annotation-xml encoding="text/html"><img src=x onerror=alert(1)></annotation-xml></math>',
        '<math><maction actiontype="statusline#x">x</maction></math>',
        '<math><mi href="javascript:alert(1)">x</mi></math>',
        '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
        '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
        '<math><mtext><h1><a href="javascript:alert(1)">x</a></h1></mtext></math>',
        '<svg><math><mi><img src=x onerror=alert(1)></mi></math></svg>',
        '<math><semantics><annotation><img src=x onerror=alert(1)></annotation></semantics></math>',
    ]
    // In these two the HTML parser itself closes the <math> at the <img> (a breakout tag in foreign content), so
    // the image reaches DOMPurify as an ordinary top-level <img>, which statements may carry. Its handler is gone
    // and it is outside any MathML: the same as `<img src=x onerror=alert(1)>` written in plain HTML.
    const breakouts: Record<string, string> = {
        '<svg><math><mi><img src=x onerror=alert(1)></mi></math></svg>': `<svg></svg>${img}`,
        '<math><semantics><annotation><img src=x onerror=alert(1)></annotation></semantics></math>':
            `<math><semantics><annotation></annotation></semantics></math>${img}`,
    }
    const banned = ['onerror', '<script', '<style', 'href', 'javascript:', 'annotation-xml', 'maction', 'mglyph']
    for (const payload of payloads) {
        const out = sanitize(payload)
        for (const b of banned) expect(out, `${payload} -> ${out}`).not.toContain(b)
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.querySelector('math img, svg img, math style, svg style'), `${payload} -> ${out}`).toBeNull()
        if (payload in breakouts) expect(out).toBe(breakouts[payload])
        else expect(out, `${payload} -> ${out}`).not.toContain('<img')
    }
}
