// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ContestStatus from '../ContestStatus.vue'

describe('ContestStatus', () => {
    it.each([
        ['RUNNING', 'Live', 'text-primary'],
        ['UPCOMING', 'Upcoming', 'text-ink-2'],
        ['ENDED', 'Ended', 'text-muted-foreground'],
    ] as const)('%s reads as %s in its ink colour with one icon and no fill', (phase, label, tone) => {
        const w = mount(ContestStatus, { props: { phase } })
        const root = w.get('span')
        expect(w.text()).toBe(label)
        expect(root.classes()).toContain(tone)
        expect(root.classes().some((c) => c.startsWith('bg-'))).toBe(false)
        expect(w.findAll('svg')).toHaveLength(1)
        expect(w.get('svg').attributes('aria-hidden')).toBe('true')
    })
})
