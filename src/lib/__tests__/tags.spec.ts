import { describe, it, expect } from 'vitest'
import { normalizeTag, MAX_TAGS, SEED_TAG_VOCABULARY } from '@/lib/tags'

describe('normalizeTag', () => {
    it('normalizesAndValidates', () => {
        expect(normalizeTag('  DP ')).toEqual({ tag: 'dp' })
        expect(normalizeTag('Two-Pointers')).toEqual({ tag: 'two-pointers' })
        expect(normalizeTag('bfs2')).toEqual({ tag: 'bfs2' })
        for (const bad of ['', '   ', 'a b', '-a', 'a-', 'a--b', 'a_b', 'bfs/dfs']) {
            expect(normalizeTag(bad)).toHaveProperty('error')
        }
    })

    it('rejectsOver32', () => {
        expect(normalizeTag('a'.repeat(32))).toEqual({ tag: 'a'.repeat(32) })
        expect(normalizeTag('a'.repeat(33))).toHaveProperty('error')
    })

    it('exposes constants', () => {
        expect(MAX_TAGS).toBe(10)
        expect(SEED_TAG_VOCABULARY).toHaveLength(32)
    })
})
