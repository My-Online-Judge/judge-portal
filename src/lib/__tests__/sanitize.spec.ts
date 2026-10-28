// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import DOMPurify from 'dompurify'
import { sanitizeHtml } from '@/lib/sanitize'

describe('sanitizeHtml', () => {
    it('returns empty string for nullish or empty input', () => {
        expect(sanitizeHtml('')).toBe('')
        expect(sanitizeHtml(null)).toBe('')
        expect(sanitizeHtml(undefined)).toBe('')
    })

    it('imagesSendNoReferrer', () => {
        const doc = new DOMParser().parseFromString(sanitizeHtml('<p><img src="https://example.com/p.gif" alt="p"></p>'), 'text/html')
        expect(doc.querySelector('img')?.getAttribute('referrerpolicy')).toBe('no-referrer')
        expect(doc.querySelector('img')?.getAttribute('src')).toBe('https://example.com/p.gif')
    })

    it('anAuthorsReferrerPolicyIsReplaced', () => {
        const out = sanitizeHtml('<img src="https://example.com/p.gif" referrerpolicy="unsafe-url">')
        expect(out).toContain('referrerpolicy="no-referrer"')
        expect(out).not.toContain('unsafe-url')
    })

    it('theImageHookIsGoneAfterTheCall', () => {
        sanitizeHtml('<img src="https://example.com/p.gif">')
        expect(DOMPurify.sanitize('<img src="https://example.com/p.gif">')).not.toContain('referrerpolicy')
    })

    it('theImageHookIsGoneWhenSanitisingThrows', () => {
        const spy = vi.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => {
            throw new Error('boom')
        })
        try {
            expect(() => sanitizeHtml('<img src="https://example.com/p.gif">')).toThrow('boom')
        } finally {
            spy.mockRestore()
        }
        expect(DOMPurify.sanitize('<img src="https://example.com/p.gif">')).not.toContain('referrerpolicy')
    })

    // A statement is author content shown inside the portal's own page: it may format text, but not restyle the page,
    // plant a form, or embed a frame. What tiptap's StarterKit (with sub/superscript) emits, plus images, tables and the
    // inline tags imported statements use, is kept; everything else goes.
    describe('what an author cannot put in a statement', () => {
        it.each([
            ['a style element', '<style>body{display:none}</style><p>ok</p>', '<p>ok</p>'],
            ['a form with an input', '<form action="https://x"><input name="p"></form><p>ok</p>', '<p>ok</p>'],
            ['an iframe', '<iframe src="https://x"></iframe><p>ok</p>', '<p>ok</p>'],
            ['an inline style', '<p style="position:fixed;inset:0">a</p>', '<p>a</p>'],
            ['an id or a name', '<p id="login" name="user">a</p>', '<p>a</p>'],
            ['a data attribute', '<p data-x="1">a</p>', '<p>a</p>'],
            ['a script', '<p>a</p><script>alert(1)</script>', '<p>a</p>'],
            ['an event handler', '<p onclick="alert(1)">a</p>', '<p>a</p>'],
            ['a javascript link', '<a href="javascript:alert(1)">a</a>', '<a>a</a>'],
            ['an svg', '<svg><circle r="1"/></svg><p>ok</p>', '<p>ok</p>'],
        ])('drops %s', (_name, dirty, clean) => {
            expect(sanitizeHtml(dirty)).toBe(clean)
        })
    })

    // The element goes; its text stays (DOMPurify keeps the content of a tag it removes), so there is nothing to click or type in.
    it.each(['<button>pay</button>', '<textarea>a</textarea>', '<select><option>b</option></select>', '<input>', '<form></form>'])(
        'leaves no control element from %s', (dirty) => {
            const doc = new DOMParser().parseFromString(sanitizeHtml(`${dirty}<p>ok</p>`), 'text/html')
            expect(doc.querySelector('button, textarea, select, option, input, form')).toBeNull()
            expect(doc.querySelector('p')?.textContent).toBe('ok')
        })

    describe('what tiptap and imported statements need', () => {
        it.each([
            '<h2>t</h2>',
            '<ul><li><p>a</p></li></ul>',
            '<ol><li>a</li></ol>',
            '<ol start="3"><li>c</li></ol>',
            '<blockquote><p>q</p></blockquote>',
            '<pre><code class="language-cpp">int x;</code></pre>',
            '<p><strong>b</strong> <em>i</em> <s>s</s> <u>u</u> <code>c</code> x<sub>1</sub> x<sup>2</sup><br></p>',
            '<hr>',
            '<p><a href="https://example.com/p" rel="noopener noreferrer nofollow">link</a></p>',
            '<table><thead><tr><th colspan="2">h</th></tr></thead><tbody><tr><td rowspan="2">a</td><td>b</td></tr></tbody></table>',
            '<p><kbd>Ctrl</kbd> <samp>out</samp> <var>n</var> <mark>m</mark></p>',
        ])('keeps %s', (html) => {
            expect(sanitizeHtml(html)).toBe(html)
        })

        it('still drops target from a link, as before (a link opens in the same tab)', () => {
            expect(sanitizeHtml('<a href="https://example.com/p" target="_blank">l</a>')).toBe('<a href="https://example.com/p">l</a>')
        })

        it('keeps an image with its source, alt and size (the no-referrer hook adds its policy)', () => {
            const doc = new DOMParser().parseFromString(
                sanitizeHtml('<img src="https://example.com/p.png" alt="a" title="t" width="10" height="20">'), 'text/html')
            const img = doc.querySelector('img')!
            expect([img.getAttribute('src'), img.getAttribute('alt'), img.getAttribute('title'),
                img.getAttribute('width'), img.getAttribute('height')])
                .toEqual(['https://example.com/p.png', 'a', 't', '10', '20'])
        })
    })
})
