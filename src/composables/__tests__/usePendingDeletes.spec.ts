import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { usePendingDeletes, isAlreadyGone } from '@/composables/usePendingDeletes'

const rows = [{ s: 'a' }, { s: 'b' }, { s: 'c' }]
const key = (r: { s: string }) => r.s

describe('usePendingDeletes', () => {
    it('hides pending rows from every later list and shows them again on remove', () => {
        const p = usePendingDeletes()
        p.add('a')
        p.add('b')
        expect(p.filter(rows, key)).toEqual([{ s: 'c' }])
        expect(p.filter([{ s: 'a' }, { s: 'z' }], key)).toEqual([{ s: 'z' }])
        p.remove('a')
        expect(p.filter(rows, key).map(key)).toEqual(['a', 'c'])
    })
    it('add reports a repeat so a second delete does nothing', () => {
        const p = usePendingDeletes()
        expect(p.add('a')).toBe(true)
        expect(p.add('a')).toBe(false)
        expect(p.has('a')).toBe(true)
    })
})

describe('isAlreadyGone', () => {
    const http = (status: number) => new AxiosError('x', undefined, undefined, undefined, { status } as never)
    it('counts only a 404 as success', () => {
        expect(isAlreadyGone(http(404))).toBe(true)
        expect(isAlreadyGone(http(500))).toBe(false)
        expect(isAlreadyGone(new Error('x'))).toBe(false)
    })
})
