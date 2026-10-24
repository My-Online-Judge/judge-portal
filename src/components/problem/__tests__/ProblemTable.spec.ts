// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProblemTable from '../ProblemTable.vue'
import type { Problem } from '@/types/problem'

const make = (over: Partial<Problem> = {}): Problem =>
    ({
        id: 1,
        title: 'Day con tang dai nhat',
        problemSlug: 'lis',
        hardnessLevel: 2,
        totalSubmission: 1284,
        acceptedSubmission: 788,
        tags: ['dp'],
        ...over,
    }) as Problem

const mountTable = (problems: Problem[], showTags = true) =>
    mount(ProblemTable, {
        props: { problems, showTags },
        global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

describe('ProblemTable', () => {
    it('acceptanceIsOneDecimal', () => {
        expect(mountTable([make()]).text()).toContain('61.4%')
    })

    it('acceptanceDashWhenNoSubmissions', () => {
        const w = mountTable([make({ totalSubmission: 0, acceptedSubmission: 0 })])
        const cells = w.findAll('tbody td')
        const texts = cells.map((c) => c.text())
        expect(texts.filter((t) => t === '-')).toHaveLength(2)
        expect(w.text()).not.toContain('%')
    })

    it('noIndexOrProgressColumn', () => {
        const w = mountTable([make()])
        expect(w.find('[role=progressbar]').exists()).toBe(false)
        const heads = w.findAll('th').map((h) => h.text())
        expect(heads).not.toContain('#')
        expect(heads).toEqual(['Title', 'Tags', 'Difficulty', 'Acceptance', 'Submissions'])
    })

    it('difficultyBadgeInRow', () => {
        expect(mountTable([make({ hardnessLevel: 2 })]).text()).toContain('Medium')
    })

    it('renders no placeholder when a problem has no tags', () => {
        const w = mountTable([make({ tags: [] })])
        expect(w.text()).not.toContain('—')
    })

    it('rendersTagsAsCommaText', () => {
        const w = mountTable([make({ tags: ['beginner', 'math'] })])
        const cell = w.get('[data-col="tags"]')
        expect(cell.text()).toBe('beginner, math')
        expect(w.find('.font-mono').exists()).toBe(false)
    })

    it('keepsTitleLink', () => {
        const w = mountTable([make({ problemSlug: 'tong-tu-1-den-n', title: 'Tong tu 1 den n' })])
        expect(w.get('tbody a').attributes('href')).toBe('/problems/tong-tu-1-den-n')
    })
})
