import { describe, it, expect } from 'vitest'
import { useLoginPrompt } from '@/composables/useLoginPrompt'

describe('useLoginPrompt', () => {
    it('request() opens the prompt, and the state is shared', () => {
        const a = useLoginPrompt()
        a.open.value = false
        useLoginPrompt().request()
        expect(a.open.value).toBe(true)
    })
})
