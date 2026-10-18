import { describe, it, expect } from 'vitest'
import { getSchema } from '@tiptap/core'
import { DOMSerializer } from '@tiptap/pm/model'
import { richTextExtensions } from '../extensions'

// The editor keeps only what its schema knows: a mark it cannot parse is dropped on load, and the
// admin form saves editor.getHTML() — so a statement written with 10<sup>9</sup> would be saved as
// "109". Both directions must exist for <sup>/<sub> to survive an open-and-save.
const schema = getSchema(richTextExtensions())

describe('richTextExtensions', () => {
    it.each([
        ['superscript', 'sup'],
        ['subscript', 'sub'],
    ])('reads and writes the %s mark as <%s>', (mark, tag) => {
        const type = schema.marks[mark]
        expect(type, `schema has no ${mark} mark`).toBeDefined()

        const parsesTag = (type.spec.parseDOM ?? []).some((rule) => 'tag' in rule && rule.tag === tag)
        expect(parsesTag).toBe(true)

        const spec = type.spec.toDOM?.(type.create(), true)
        expect(Array.isArray(spec) ? spec[0] : spec).toBe(tag)
        expect(DOMSerializer.fromSchema(schema).marks[mark]).toBeDefined()
    })
})
