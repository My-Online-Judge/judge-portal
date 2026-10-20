// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderMath } from '../math'

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
        expect(out).not.toContain('javascript:')
        expect(out).not.toContain('<a')
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
        expect(out).not.toContain('javascript:')
    })

    it('macroBombIsBounded', () => {
        const start = Date.now()
        const out = renderMath('<p>$\\def\\a{\\a\\a}\\a$</p>')
        expect(Date.now() - start).toBeLessThan(2000)
        expect(out).toContain('katex-error')
    })

    it('hugeSizeIsClamped', () => {
        const out = renderMath('<p>$\\rule{99999em}{1em}$</p>')
        expect(out).not.toContain('99999')
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
        expect(out).not.toContain('evil')
    })

    it('sqrtKeepsItsSvgAfterSanitising', () => {
        const out = renderMath('<p>$\\sqrt{x}$</p>')
        const doc = new DOMParser().parseFromString(out, 'text/html')
        expect(doc.querySelector('svg')).not.toBeNull()
        expect(doc.querySelector('svg path')?.getAttribute('d')).toBeTruthy()
        expect(doc.querySelector('svg')?.getAttribute('viewBox')).toBeTruthy()
    })
})
