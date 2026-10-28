// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderMath, sanitizeMathStatement } from '../math'

/**
 * The output without its TeX annotations. The MathML carries each formula's source as the text of an <annotation>,
 * which is inert text, so the checks below that no markup comes out of the TeX look at everything else. They also
 * check that every annotation is text only.
 */
function withoutTexSource(out: string): string {
    const doc = new DOMParser().parseFromString(out, 'text/html')
    for (const a of doc.querySelectorAll('annotation')) {
        expect(a.children.length).toBe(0)
        a.remove()
    }
    return doc.body.innerHTML
}

describe('renderMath', () => {
    it('rendersInlineMath', () => {
        const out = renderMath('<p>$x^2$</p>')
        expect(out).toContain('class="katex"')
        expect(out).not.toContain('$x^2$')
    })

    it('rendersDisplayMath', () => {
        expect(renderMath('<p>$$\\frac{1}{2}$$</p>')).toContain('katex-display')
    })

    it('leavesCodeAlone', () => {
        const html = '<p><code>$x$</code></p>'
        expect(renderMath(html)).toBe(html)
        const pre = '<pre><code>a $b$ c</code></pre>'
        expect(renderMath(pre)).toBe(pre)
    })

    it('pricesAreNotMath', () => {
        const html = '<p>costs $5 and $6</p>'
        expect(renderMath(html)).toBe(html)
    })

    it('escapedDollarIsLiteral', () => {
        expect(renderMath('<p>\\$5</p>')).toBe('<p>$5</p>')
    })

    it('badTexDoesNotThrow', () => {
        expect(renderMath('<p>$\\frac{$</p>')).toContain('katex-error')
    })

    it('hrefIsNotTrusted', () => {
        const out = renderMath('<p>$\\href{javascript:alert(1)}{x}$</p>')
        expect(withoutTexSource(out)).not.toContain('javascript:')
        expect(withoutTexSource(out)).not.toContain('<a')
    })

    it('xssInsideMathIsInert', () => {
        // The text node holds the TeX source "<img src=x onerror=alert(1)>", as the sanitised HTML carries it escaped.
        const out = renderMath(
            '<p>$\\text{&lt;img src=x onerror=alert(1)&gt;}$ $$\\htmlClass{a}{&lt;script&gt;alert(1)&lt;/script&gt;}$$ ' +
                '$\\htmlData{x=y}{z}$ $\\includegraphics{javascript:alert(1)}$</p>',
        )
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.querySelector('script, img, a, iframe')).toBeNull()
        expect(doc.querySelector('[onerror], [onclick], [href], [src]')).toBeNull()
        expect(withoutTexSource(out)).not.toContain('javascript:')
    })

    it('macroBombIsBounded', () => {
        const start = Date.now()
        const out = renderMath('<p>$\\def\\a{\\a\\a}\\a$</p>')
        expect(Date.now() - start).toBeLessThan(2000)
        expect(out).toContain('katex-error')
    })

    it('hugeSizeIsClamped', () => {
        const out = renderMath('<p>$\\rule{99999em}{1em}$</p>')
        expect(withoutTexSource(out)).not.toContain('99999')
    })

    it('mixesTextAndMath', () => {
        const out = renderMath('<p>Given <b>n</b> with $1 \\le n \\le 10^5$ items</p>')
        expect(out).toContain('<b>n</b>')
        expect(out).toContain('class="katex"')
        expect(out).toContain('items</p>')
    })

    it('anInternalKatexFailureFallsBackToTheEscapedSource', () => {
        const out = renderMath('<p>a $' + '{'.repeat(50000) + '$ b</p>')
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.body.textContent).toContain('a ')
        expect(doc.body.textContent).toContain(' b')
        expect(doc.querySelector('.katex')).toBeNull()
    })

    it('katexIsCalledWithTrustFalse', async () => {
        const katex = (await import('katex')).default
        const spy = vi.spyOn(katex, 'renderToString')
        try {
            renderMath('<p>$x$</p>')
            expect(spy).toHaveBeenCalledWith('x', expect.objectContaining({ trust: false }))
        } finally {
            spy.mockRestore()
        }
    })

    it('htmlClassNeverReachesTheOutput', () => {
        const out = renderMath('<p>$\\htmlClass{evil}{x}$</p>')
        expect(out).toContain('class="katex"')
        expect(withoutTexSource(out)).not.toContain('evil')
    })

    it('sqrtKeepsItsSvgAfterSanitising', () => {
        const out = renderMath('<p>$\\sqrt{x}$</p>')
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.querySelector('svg')).not.toBeNull()
        expect(doc.querySelector('svg path')?.getAttribute('d')).toBeTruthy()
        expect(doc.querySelector('svg')?.getAttribute('viewBox')).toBeTruthy()
    })

    it('screenReadersGetMathml', () => {
        const doc = new DOMParser().parseFromString(renderMath('<p>$x^2$</p>'), 'text/html')
        const annotation = doc.querySelector('.katex-mathml math annotation[encoding="application/x-tex"]')
        expect(annotation?.textContent).toBe('x^2')
        expect(doc.querySelector('.katex-mathml math msup')).not.toBeNull()
        expect(doc.querySelector('.katex-html[aria-hidden="true"]')).not.toBeNull()
    })

    it('aStatementWithALinkAndAFormulaKeepsTheLink', () => {
        const out = renderMath('<p>See <a href="https://example.com/doc" rel="noopener noreferrer nofollow">the doc</a> for $x^2$</p>')
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.querySelector('a')?.getAttribute('href')).toBe('https://example.com/doc')
        expect(doc.querySelector('.katex-mathml math')).not.toBeNull()
    })
})

describe('sanitizeMathStatement', () => {
    it('keeps the inline style KaTeX lays its output out with', () => {
        const out = sanitizeMathStatement('<span class="katex"><span style="height:0.6833em;vertical-align:-0.15em">x</span></span>')
        expect(out).toContain('style="height:0.6833em;vertical-align:-0.15em"')
    })

    it.each(['<form action="https://x"><input name="p"></form>', '<style>p{color:red}</style>', '<button>b</button>',
        '<textarea>t</textarea>', '<select><option>o</option></select>', '<iframe src="https://x"></iframe>'])(
        'drops %s even though the html and svg profiles allow it', (dirty) => {
            const doc = new DOMParser().parseFromString(sanitizeMathStatement(`<p>ok</p>${dirty}`), 'text/html')
            expect(doc.querySelector('form, input, style, button, textarea, select, option, iframe')).toBeNull()
            expect(doc.querySelector('p')?.textContent).toBe('ok')
        })
})
