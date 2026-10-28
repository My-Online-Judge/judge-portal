import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// The edge sends `script-src 'self'` (judge-deployment/edge/Caddyfile): an inline <script> would be blocked, and the
// theme would flash light before the app loads. The first-paint theme script therefore lives in a file of its own.
const root = resolve(__dirname, '../..')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')

describe('index.html under a script-src self policy', () => {
    it('has no inline script', () => {
        const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
            .filter(([, attrs, body]) => !/\bsrc=/.test(attrs ?? '') && (body ?? '').trim() !== '')
        expect(inline).toEqual([])
    })

    it('loads the theme script from a file, before the app mounts', () => {
        const theme = html.indexOf('src="/theme-init.js"')
        expect(theme).toBeGreaterThan(-1)
        expect(theme).toBeLessThan(html.indexOf('id="app"'))
    })

    it('ships that file, and it sets the same class and data attribute as the app', () => {
        const js = readFileSync(resolve(root, 'public/theme-init.js'), 'utf8')
        expect(js).toContain("localStorage.getItem('theme')")
        expect(js).toContain("classList.toggle('dark'")
        expect(js).toContain('dataset.theme')
    })
})
