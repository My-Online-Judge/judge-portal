// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ContestCountdown from '../ContestCountdown.vue'

const NOW = Date.parse('2026-10-21T10:00:00Z')

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('ContestCountdown', () => {
    const target = new Date(NOW + 93_784_000).toISOString()

    it('readsInTheBodyFaceWithTabularFigures', () => {
        const w = mount(ContestCountdown, { props: { target, offsetMs: 0 } })
        expect(w.text()).toBe('1d 02:03:04')
        const classes = w.get('span').classes()
        expect(classes).toEqual(expect.arrayContaining(['tabular-nums', 'text-base', 'font-medium']))
        expect(classes).not.toContain('font-mono')
    })

    it('aCallerCanAskForASmallerSizeWithoutBothSizesApplying', () => {
        const w = mount(ContestCountdown, { props: { target, offsetMs: 0, class: 'text-sm text-foreground' } })
        const classes = w.get('span').classes()
        expect(classes).toEqual(expect.arrayContaining(['text-sm', 'text-foreground', 'tabular-nums']))
        expect(classes).not.toContain('text-base')
    })
})
