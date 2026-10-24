// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VerdictTiles from '../VerdictTiles.vue'
import type { Submission, TestCaseResult } from '@/types/submission'

const tc = (name: string, over: Partial<TestCaseResult> = {}): TestCaseResult => ({
    name, result: 0, cpuTime: 12, realTime: 12, memory: 1887436, sample: false, ...over,
})
const sub = (over: Partial<Submission> = {}): Submission =>
    ({ id: 'abcdef123456', status: 0, result: 0, errorMessage: '', cpuTime: 12, memory: 1, details: [], ...over }) as Submission
const mountIt = (s: Submission) => mount(VerdictTiles, { props: { submission: s }, attachTo: document.body })

describe('VerdictTiles', () => {
    it('hiddenTileNeverRendersData', async () => {
        const leaky = tc('2', { result: -1, input: 'SECRET_IN', expectedOutput: 'SECRET_EXP', actualOutput: 'SECRET_OUT' })
        const w = mountIt(sub({ status: -1, result: -1, details: [leaky] }))
        await w.get('[data-test="tile-2"]').trigger('click')
        expect(w.html()).not.toContain('SECRET')
        // The pane opens with the verdict and limits only.
        expect(w.find('[data-test="hidden-note"]').exists()).toBe(true)
        expect(w.findAll('[data-test="detail-box"]').length).toBe(0)
    })
    it('sampleTileShowsThreeBoxes', async () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('1', { result: -1, sample: true, input: 'IN', expectedOutput: 'EXP', actualOutput: 'OUT' })] }))
        expect(w.findAll('[data-test="detail-box"]')).toHaveLength(3)
        expect(w.text()).toContain('IN')
        expect(w.text()).toContain('EXP')
        expect(w.text()).toContain('OUT')
    })
    it('compileErrorShowsMessageNoTiles', () => {
        const w = mountIt(sub({ status: -2, result: -2, errorMessage: 'syntax error here', details: null }))
        expect(w.text()).toContain('syntax error here')
        expect(w.findAll('[data-test^="tile-"]')).toHaveLength(0)
    })
    it('systemErrorShowsGenericMessage', () => {
        const w = mountIt(sub({ status: 5, result: 5, errorMessage: 'internal stack trace', details: [tc('1')] }))
        expect(w.text()).toContain('Something went wrong while judging. Please submit again.')
        expect(w.text()).not.toContain('internal stack trace')
        expect(w.findAll('[data-test^="tile-"]')).toHaveLength(0)
    })
    it('nullDetailsShowsNotice', () => {
        const w = mountIt(sub({ details: null }))
        expect(w.text()).toContain('Per-test results are not available for this submission.')
    })
    it('nullOutputShowsNotKept', () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('1', { result: -1, sample: true, input: 'i', expectedOutput: 'e', actualOutput: null })] }))
        expect(w.text()).toContain('Output not kept (too large to store)')
    })
    it('emptyOutputShowsNoOutput', () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('1', { result: -1, sample: true, input: 'i', expectedOutput: 'e', actualOutput: '' })] }))
        expect(w.text()).toContain('(no output)')
    })
    it('passedCountInSummary', () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('1'), tc('2', { result: -1 }), tc('3')] }))
        expect(w.get('[data-test="summary-count"]').text()).toBe('2 / 3')
        expect(w.get('[data-test="tile-2"]').attributes('aria-label')).toBe('Test 2: Wrong answer, hidden, show details')
    })
    it('hiddenTileOpensItsVerdictButNoData', async () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('1', { sample: true, input: 'i', expectedOutput: 'e', actualOutput: 'e' }), tc('2', { result: -1 })] }))
        const tile = w.get('button[data-test="tile-2"]')
        expect(tile.element.parentElement?.getAttribute('role')).toBe('listitem')
        // The failed hidden test is the one that opens first.
        expect(tile.attributes('aria-pressed')).toBe('true')
        expect(w.get('[data-test="detail-pane"]').text()).toContain('Hidden')
        expect(w.get('[data-test="detail-pane"]').text()).toContain('Wrong answer')
        expect(w.findAll('[data-test="detail-box"]')).toHaveLength(0)
    })
    it('sampleTileOpensDetail', async () => {
        const w = mountIt(sub({ status: 0, result: 0, details: [tc('1', { sample: true, input: 'i', expectedOutput: 'e', actualOutput: 'e' })] }))
        const tile = w.get('button[data-test="tile-1"]')
        expect(tile.attributes('aria-pressed')).toBe('true')
        await tile.trigger('click')
        expect(w.find('[data-test="detail-pane"]').exists()).toBe(true)
    })
    it('headerNamesTheVerdictAndOpensTheFirstFailure', () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('6'), tc('7', { result: -1 })] }))
        expect(w.get('[data-test="verdict-title"]').text()).toBe('Wrong answer')
        expect(w.get('[data-test="tile-7"]').attributes('aria-pressed')).toBe('true')
    })
    it('detailShowsDiffLine', () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [tc('1', { result: -1, sample: true, input: 'i', expectedOutput: '1\n2', actualOutput: '1\n3' })] }))
        expect(w.text()).toContain('Differs on line 2')
    })
    it('sampleTilesKeepButtonSemanticsAndSelectionState', async () => {
        const w = mountIt(sub({ status: -1, result: -1, details: [
            tc('1', { result: -1, sample: true, input: 'i', expectedOutput: 'e', actualOutput: 'x' }),
            tc('2', { sample: true, input: 'i', expectedOutput: 'e', actualOutput: 'e' }),
        ] }))
        const buttons = w.findAll('button[data-test^="tile-"]')
        expect(buttons).toHaveLength(2)
        for (const b of buttons) {
            expect(b.attributes('role')).toBeUndefined()
            expect(b.element.parentElement?.getAttribute('role')).toBe('listitem')
        }
        expect(buttons[0].attributes('aria-pressed')).toBe('true')
        expect(buttons[1].attributes('aria-pressed')).toBe('false')
        await buttons[1].trigger('click')
        expect(buttons[0].attributes('aria-pressed')).toBe('false')
        expect(buttons[1].attributes('aria-pressed')).toBe('true')
    })
})
